import {User} from "./entity/user";
import {connection} from "./main";

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
