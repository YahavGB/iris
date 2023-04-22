import {Blueprint, BlueprintFormatException} from './blueprint';
import {Accessory} from '../models';
import {AccessoryType} from '../models/accessory';

/**
 * A blueprint class for building Accessory objects.
 */
export class AccessoryBlueprint implements Blueprint<Accessory> {
  /**
   * Builds an Accessory object based on the provided JSON input.
   * @param input The JSON input used to build the Accessory object.
   * @returns A Promise of type Accessory representing the built object.
   */
  async build(input: unknown): Promise<Accessory> {
    if (!input || typeof input !== 'object') {
      throw new BlueprintFormatException(
        "Invalid blueprint: Accessory input isn't an object"
      );
    }

    const blueprint = input as {
      type?: unknown;
      provider?: unknown;
      name?: unknown;
      configuration?: unknown;
    };
    if (!blueprint.type || typeof blueprint.type !== 'string') {
      throw new BlueprintFormatException(
        'Invalid blueprint: type field is missing or invalid'
      );
    }

    if (!blueprint.provider || typeof blueprint.provider !== 'string') {
      throw new BlueprintFormatException(
        'Invalid blueprint: provider field is missing or invalid'
      );
    }

    if (!blueprint.name || typeof blueprint.name !== 'string') {
      throw new BlueprintFormatException(
        'Invalid blueprint: name field is missing or invalid'
      );
    }

    const {type, provider, name, configuration} = blueprint;

    const accessory = new Accessory();
    accessory.name = name as string;
    accessory.accessoryType = (type as AccessoryType) || AccessoryType.UNKNOWN;
    accessory.providerKey = provider as string;
    accessory.configuration = configuration || {};

    return accessory;
  }
}
