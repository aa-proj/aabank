import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "./user";

@Entity("Transaction")
export class Transaction {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column({type: "datetime", default: 0})
    timestamp: Date

    @ManyToOne((type) => User)
    fromUser?: User

    @ManyToOne((type) => User)
    toUser?: User

    @Column({type: "int", default: null})
    amount?: number

    @Column({type: "text", default: ""})
    memo?: string
}