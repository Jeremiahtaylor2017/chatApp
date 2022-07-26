import mongoose, { Schema } from 'mongoose';

export interface UserType {
    username: string,
    password: string
}

const userSchema = new Schema<UserType>({
    username: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    }
})

const UserModel = mongoose.model<UserType>("User", userSchema);

export default UserModel;