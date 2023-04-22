// Define the interface for a blueprint
export interface Blueprint<T> {
  /**
   * Builds an object of type T based on the provided JSON input.
   * @param input The JSON input used to build the object.
   * @returns A Promise of type T representing the built object.
   */
  build(input: unknown): Promise<T>;
}

export class BlueprintFormatException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlueprintFormatException';
  }
}
