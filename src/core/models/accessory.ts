import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
} from 'typeorm';
import {Room} from './room';

export enum AccessoryType {
  UNKNOWN = 'unknown',
  LIGHT = 'light',
  DIMMER = 'dimmer',
  SWITCH = 'switch',
  SHADE = 'shade',
}

@Entity()
export class Accessory extends BaseEntity {
  @PrimaryColumn()
  id: string;

  @Column({nullable: false})
  name: string;

  @ManyToOne(() => Room, room => room.accessories)
  room: Room;

  @Column({
    type: 'enum',
    enum: AccessoryType,
    default: AccessoryType.UNKNOWN,
    nullable: false,
  })
  accessoryType: AccessoryType;

  @Column({nullable: false})
  providerKey: string;

  @Column({type: 'json', nullable: true})
  configuration: object;

  @Column({type: 'json', nullable: true})
  currentState: object;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
