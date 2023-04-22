#!/bin/env python3

import argparse
import os.path
import shutil
import sys
import typing
from typing import Dict, Callable

import docker
from rich.console import Console
from rich import traceback
from rich.panel import Panel
from rich.prompt import Prompt
from rich.table import Table
from recordtype import recordtype
from dotenv import load_dotenv
import datetime

IRIS_CONDUCTOR_VERSION = "1.0.0"
IRIS_SERVICES = [
  # Databases and messaging
  "mongo", "nats-streaming",

  # ELK Stack
  "elasticsearch", "kibana", "logstash", "apm-server",

  # Metrics
  "prometheus", "alertmanager", "cadvisor", "grafana", "pushgateway", "caddy",

  # Exporters
  "elasticsearch-exporter", "filebeat", "logstash-exporter", "node-exporter"
]
IRIS_SERVICES.sort()

# Enable rich traceback
traceback.install(show_locals=True)
console = Console()

# Global variables
docker_client = docker.from_env()

# region Types


CommandExecutionResult = recordtype('CommandExecutionResult', 'success command stdout stderr return_code')
DockerContainerHealth = recordtype('DockerContainerHealth', 'id name ports is_running status started_at uptime')


class CommandExecutionException(Exception):
  def __init__(self, result: CommandExecutionResult):
    super().__init__(result.command)
    self.command = result


# endregion

##################################################
# CLI Helpers
##################################################

# region Helpers

def get_commands_map() -> Dict[str, Callable]:
  return {
    'help': handle_command_help,
    'version': handle_command_version,
    'setup': handle_command_setup,
    'start': handle_command_start,
    'stop': handle_command_stop,
    'restart': handle_command_restart,
    'status': handle_command_status,
    'destroy': handle_command_destroy,
  }


def show_ascii_art():
  with open(os.path.join(os.path.dirname(__file__), 'banner.txt'), 'r') as banner_file:
    banner = banner_file.read()
    console.print(banner, style="bold purple")


def run_shell_command(command: str, verbose: bool = False) -> CommandExecutionResult:
  import subprocess
  process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
  stdout, stderr = process.communicate()
  return_code = process.returncode

  if verbose:
    table = Table(highlight=True, box=None, show_header=False)
    table.add_row("Command", f"[bold]{command}[/bold]")
    table.add_row("Return Code", f"[bold]{return_code}[/bold]")
    console.print(Panel(table, title="Executed Command", expand=False))

    if stdout:
      table = Table(highlight=True, box=None, show_header=False)
      table.add_row(f"[bold]{stdout.decode('utf-8')}[/bold]")
      console.print(Panel(table, title="[bold green]STDOUT[/bold green]", expand=False))

    if stderr:
      table = Table(highlight=True, box=None, show_header=False)
      table.add_row(f"[bold]{stderr.decode('utf-8')}[/bold]")
      console.print(Panel(table, title="[bold red]STDERR[/bold red]", expand=False))

  return CommandExecutionResult(return_code == 0, command, stdout, stderr, return_code)


def show_command_title(title: str):
  console.print(f"[bold underline purple]{title}[/bold underline purple]\n")


def perform_task(task_name: str, task: Callable[[], bool], exit_on_failure: bool = True) -> bool:
  success = False
  with console.status(f"[bold]{task_name}[/bold]...") as status:
    try:
      if task():
        # print an ascii checkmark
        console.log(f"\u2713 {task_name}", style="bold green")
        success = True
      else:
        # print an ascii cross
        console.log(f"\u2717 {task_name}", style="bold red")
    except CommandExecutionException as e:
      console.log(f"\u2717 {task_name}: command execution failed\nExecuted Command: "
                  f"[underline]{e.command.command}[/underline]", style="bold red")

      if e.command.stdout:
        stdout_panel = Panel(e.command.stdout.decode('utf-8'), title="STDOUT", expand=False)
        console.print(stdout_panel)

      if e.command.stderr:
        stderr_panel = Panel(e.command.stderr.decode('utf-8'), title="STDERR", expand=False)
        console.print(stderr_panel)
    except Exception as e:
      console.log(f"\u2717 {task_name} ({type(e)} exception raised)", style="bold red")
      console.log(e)

  if not success and exit_on_failure:
    console.print("\nFatal error occurred. Aborting.", style="bold red")
    sys.exit(1)

  return success


def perform_shell_command_task(task_name: str, command: str, verbose: bool = False, exit_on_failure: bool = True):
  def shell_command_task() -> bool:
    result = run_shell_command(command, verbose)
    if not result.success:
      raise CommandExecutionException(result)
    return True

  perform_task(task_name, shell_command_task, exit_on_failure)


def resolve_docker_compose_file_path(service_name: str) -> str:
  if service_name == "":
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "compose", "docker-compose.yml"))

  return os.path.abspath(os.path.join(os.path.dirname(__file__), "compose", f"docker-compose.{service_name}.yml"))


def get_docker_container_uptime(uptime: str):
  if uptime == "N/A":
    return uptime

  uptime = datetime.datetime.strptime(uptime, "%Y-%m-%dT%H:%M:%S.%fZ")
  current_time = datetime.datetime.now(datetime.timezone.utc)
  time_diff = current_time - uptime

  days, seconds = time_diff.days, time_diff.seconds
  hours = days * 24 + seconds // 3600
  minutes = (seconds % 3600) // 60
  seconds = seconds % 60

  elapsed_time = []
  if days > 0:
    elapsed_time.append(f"{days} days")
  if hours > 0:
    elapsed_time.append(f"{hours} hours")
  if minutes > 0:
    elapsed_time.append(f"{minutes} minutes")
  if seconds > 0:
    elapsed_time.append(f"{seconds} seconds")

  return ", ".join(elapsed_time)


def get_docker_container_status(container_name: str):
  container = docker_client.containers.get(container_name)
  if not container:
    return None

  return DockerContainerHealth(
    container.short_id,
    container.name,
    container.ports,
    container.attrs['State']['Running'] if container.attrs['State'] else False,
    container.attrs['State']['Status'],
    container.attrs['State']['StartedAt'] if container.attrs['State'] else "N/A",
    container.attrs['State']['Status'] if container.attrs['State'] else "N/A",
  )


# endregion

##################################################
# Commands
##################################################

# region Commands

def handle_command_help(parser: argparse.ArgumentParser, args: argparse.Namespace):
  show_ascii_art()
  print(parser.format_help())


def handle_command_version(parser: argparse.ArgumentParser, args: argparse.Namespace):
  table = Table(highlight=True, box=None, show_header=False)
  table.add_row(IRIS_CONDUCTOR_VERSION, style="bold")
  console.print(Panel(table, title="Iris Conductor Version", expand=False))


def handle_command_setup(parser: argparse.ArgumentParser, args: argparse.Namespace):
  show_command_title("Setting up the Iris project...")

  def prune_last_setup() -> bool:
    # Remove the contents of ./secrets
    secrets_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "secrets"))
    if os.path.exists(secrets_path):
      shutil.rmtree(secrets_path)
    return True

  perform_task("Pruning setup, if exists", prune_last_setup)
  perform_shell_command_task("Generating certificates",
                             f"docker-compose -f \"{resolve_docker_compose_file_path('setup-elk')}\" run --rm certs",
                             args.verbose)
  perform_shell_command_task("Generating keystore",
                             f"docker-compose -f \"{resolve_docker_compose_file_path('setup-elk')}\" "
                             f"run --rm keystore", args.verbose)


def handle_command_start(parser: argparse.ArgumentParser, args: argparse.Namespace):
  show_command_title("Starting Iris...")

  perform_shell_command_task("Building and Starting Docker Containers",
                             f"docker-compose -f \"{resolve_docker_compose_file_path('')}\" "
                             f"up -d --build", args.verbose)


def handle_command_status(parser: argparse.ArgumentParser, args: argparse.Namespace):
  show_command_title("Iris Services Status")

  table = Table(highlight=True, box=None, show_header=True, header_style="bold underline")
  table.add_column("Service", style="bold")
  table.add_column("Status", style="bold")
  table.add_column("Started At", style="bold")
  table.add_column("Container ID", style="bold")
  table.add_column("Ports", style="bold")

  for service in IRIS_SERVICES:
    service_status = get_docker_container_status(f"iris-{service}")
    if service_status is None:
      table.add_row(f'[red bold]{service}[/red bold]', "Not Running", "", "", "")
    else:
      label_color = "red"
      if service_status.is_running:
        label_color = "green" if service_status.status is not None and service_status.status == "running" \
          else "yellow"
      table.add_row(f'[{label_color} bold]{service}[/{label_color} bold]', service_status.status,
                    service_status.started_at,
                    service_status.id, ", ".join(service_status.ports.keys()))

  console.print(Panel(table, title="Iris Services Status", expand=False))


def handle_command_stop(parser: argparse.ArgumentParser, args: argparse.Namespace):
  show_command_title("Stopping Iris...")

  perform_shell_command_task("Stopping Docker Containers",
                             f"docker-compose -f \"{resolve_docker_compose_file_path('')}\" stop",
                             args.verbose)


def handle_command_destroy(parser: argparse.ArgumentParser, args: argparse.Namespace):
  show_command_title("Destroying Iris...")

  perform_shell_command_task("Destroying Docker Containers",
                             f"docker-compose -f \"{resolve_docker_compose_file_path('')}\" down",
                             args.verbose)


def handle_command_restart(parser: argparse.ArgumentParser, args: argparse.Namespace):
  show_command_title("Restarting Iris...")

  perform_shell_command_task("Restarting Docker Containers",
                             f"docker-compose -f \"{resolve_docker_compose_file_path('')}\" restart",
                             args.verbose)


# endregion

def start():
  print("Starting the Iris project containers...")


def restart():
  print("Restarting the Iris project containers...")


def stop():
  print("Stopping the Iris project containers...")


def handle_command_build():
  print("Building the infrastructure containers...")


def handle_command_ps():
  print("Showing the infrastructure containers status...")


def handle_command_prune():
  print("Pruning the infrastructure containers...")


def handle_command_logs():
  print("Showing the infrastructure containers logs...")


def infra(args):
  infra_commands = {
    'build': handle_command_build,
    'start': handle_command_start,
    'stop': handle_command_stop,
    'restart': handle_command_restart,
    'ps': handle_command_ps,
    'prune': handle_command_prune,
    'logs': handle_command_logs
  }

  if args.infra_command in infra_commands:
    infra_commands[args.infra_command]()
  else:
    print(f"Invalid command: {args.infra_command}")
    print("Available commands: build, start, stop, restart, ps, prune, logs")


def build():
  print("Building the Iris project containers and starting them...")


def main():
  if os.path.exists(".env"):
    load_dotenv()
  else:
    console.log("No .env file found. Aborting.", style="bold red")
    sys.exit(1)

  commands_map = get_commands_map()

  parser = argparse.ArgumentParser(add_help=False)
  parser.add_argument('command', nargs='?', default='help',
                      help=f'The command to execute: {", ".join(commands_map.keys())}', choices=commands_map.keys())
  parser.add_argument('--help', '-h', action='store_true', help='Show this help message and exit')
  parser.add_argument('--version', '-v', action='store_true', help='Show the Iris Conductor version')
  parser.add_argument('--verbose', '-V', action='store_true', help='Show verbose output')

  args, unknown = parser.parse_known_args()

  if args.command in commands_map:
    commands_map[args.command](parser, args)
  else:
    if args.help:
      handle_command_help(parser, args)
    elif args.version:
      handle_command_version(parser, args)
    else:
      handle_command_help(parser, args)


if __name__ == "__main__":
  main()
