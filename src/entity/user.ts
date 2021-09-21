import typeorm, {
    Column,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
} from "typeorm";
import { Transaction } from "./transaction";

@Entity("User")
export class User {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column({ type: "text", default: null })
    discordId?: string;

    @Column({ type: "int", default: 0 })
    amount: number;

    @OneToMany((type) => Transaction, (t) => t.fromUser)
    sendTransaction?: Transaction[];

    @OneToMany((type) => Transaction, (t) => t.toUser)
    receiveTransaction?: Transaction[];
}