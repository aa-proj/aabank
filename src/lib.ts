import {User} from "./entity/user";
import {connection} from "./main";
import {Transaction} from "./entity/transaction";

export async function userCheckInit(userId: string) {
  const userRepository = await connection?.getRepository(User);
  const user = await userRepository?.findOne({discordId: userId})
  if (!user) {
    // 未登録
    console.log("new user" + userId)
    const newUser = await userRepository?.create({discordId: userId, amount: 0})
    await userRepository?.save(<User>newUser)
    return newUser
  }
  return user
}

export enum SEND_RESULT {
  UNKNOWN,
  USERID_IS_EMPTY,
  FROM_TO_SAME,
  NOT_ENOUGH_MONEY,
  INVALID_AMOUNT,
  SUCCESS
}

export async function sendAAP(fromUserId: string, toUserId: string, amount: number, memo: string): Promise<SEND_RESULT> {
  const userRepository = await connection?.getRepository(User)
  const transactionRepository = await connection?.getRepository(Transaction)

  if (toUserId === "") {
    return SEND_RESULT.USERID_IS_EMPTY
  }

  if (toUserId === fromUserId) {
    return SEND_RESULT.FROM_TO_SAME
  }

  const toUser = await userCheckInit(toUserId)
  const fromUser = await userCheckInit(fromUserId)

  if (!toUser || !fromUser) {
    return SEND_RESULT.UNKNOWN
  }
  // ああ銀行からの生成
  if(fromUserId === "885834421771567125") {
    toUser.amount += amount
    const transaction = await transactionRepository?.create({
      fromUser, toUser, amount: Number(amount), timestamp: new Date(), memo: memo
    })
    await userRepository?.save(toUser)
    await transactionRepository?.save(<Transaction>transaction)
    return SEND_RESULT.SUCCESS
  }

  if (amount <= 0) {
    return SEND_RESULT.INVALID_AMOUNT
  }

  if (fromUser.amount < amount) {
    return SEND_RESULT.NOT_ENOUGH_MONEY
  }

  // 片方のユーザで更新が失敗した時、差し戻すためにもまとめて挿入するべき
  fromUser.amount -= amount
  toUser.amount += amount
  await userRepository?.save(fromUser)
  await userRepository?.save(toUser)
  const transaction = await transactionRepository?.create({
    fromUser, toUser, amount, timestamp: new Date(), memo
  })
  await transactionRepository?.save(<Transaction>transaction)
  return SEND_RESULT.SUCCESS
}
