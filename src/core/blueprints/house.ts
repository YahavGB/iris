import {Blueprint, BlueprintFormatException} from './blueprint';
import {House, Room} from '../models';
import {RoomBlueprint} from './room';

/**
 * A blueprint class for building House objects.
 */
export class HouseBlueprint implements Blueprint<House> {
  /**
   * Builds a House object based on the provided JSON input.
   * @param input The JSON input used to build the House object.
   * @returns A Promise of type House representing the built object.
   */
  async build(input: unknown): Promise<House> {
    // Input must be an object
    if (!input || typeof input !== 'object') {
      throw new BlueprintFormatException(
        "Invalid blueprint: House input isn't an object"
      );
    }

    // Both name and rooms are required
    const blueprint = input as {name?: unknown; rooms?: unknown};
    if (!blueprint.name || typeof blueprint.name !== 'string') {
      throw new BlueprintFormatException(
        'Invalid blueprint: name field is missing or invalid'
      );
    }

    if (!blueprint.rooms) {
      blueprint.rooms = [];
    }

    if (!Array.isArray(blueprint.rooms)) {
      throw new BlueprintFormatException(
        'Invalid blueprint: rooms field is missing or not an array'
      );
    }

    const {name, rooms} = blueprint;

    const house = new House();
    house.name = name as string;

    house.rooms = await Promise.all(
      rooms.map(async (roomInput: object) => {
        return await new RoomBlueprint().build(roomInput);
      })
    );

    return house;
  }
}
