import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  BeforeRemove,
  BaseEntity,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import {Room} from './room';

@Entity()
export class House extends BaseEntity {
  @PrimaryColumn()
  id: string;

  @Column({unique: true, nullable: false})
  name: string;

  @OneToMany(() => Room, room => room.house, {cascade: true})
  rooms: Room[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
