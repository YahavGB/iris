import {Room} from '../models';
import {Blueprint, BlueprintFormatException} from './blueprint';
import {AccessoryBlueprint} from './accessory';

/**
 * A blueprint class for building Room objects.
 */
export class RoomBlueprint implements Blueprint<Room> {
  /**
   * Builds a Room object based on the provided JSON input.
   * @param input The JSON input used to build the Room object.
   * @returns A Promise of type Room representing the built object.
   */
  async build(input: unknown): Promise<Room> {
    // Input must be an object
    if (!input || typeof input !== 'object') {
      throw new BlueprintFormatException(
        "Invalid blueprint: Room input isn't an object"
      );
    }

    const blueprint = input as {name?: unknown; accessories?: unknown};
    if (!blueprint.name || typeof blueprint.name !== 'string') {
      throw new BlueprintFormatException(
        'Invalid blueprint: name field is missing or invalid'
      );
    }

    if (!blueprint.accessories || !Array.isArray(blueprint.accessories)) {
      throw new BlueprintFormatException(
        'Invalid blueprint: accessories field is missing or not an array'
      );
    }

    const {name, accessories} = blueprint;

    const room = new Room();
    room.name = name as string;

    if (accessories) {
      room.accessories = await Promise.all(
        accessories.map(async (accessoryInput: object) => {
          return await new AccessoryBlueprint().build(accessoryInput);
        })
      );
    }

    return room;
  }
}
