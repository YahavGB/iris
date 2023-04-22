import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  OneToMany,
  BeforeRemove,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {House} from './house';
import {Accessory} from './accessory';

@Entity()
export class Room extends BaseEntity {
  @PrimaryColumn()
  id: string;

  @Column({nullable: false})
  name: string;

  @ManyToOne(() => House, house => house.rooms)
  house: House;

  @OneToMany(() => Accessory, accessory => accessory.room, {cascade: true})
  accessories: Accessory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
