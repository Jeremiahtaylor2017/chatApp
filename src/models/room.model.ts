import mongoose, { Schema } from 'mongoose';

export interface RoomType {
    name: string,
    senderName?: string,
    message?: string
}

const roomSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    senderName: {
        type: String,
    },
    message: {
        type: String,
    }
}, { timestamps: true } )

const RoomModel = mongoose.model<RoomType>('Room', roomSchema);

export default RoomModel;