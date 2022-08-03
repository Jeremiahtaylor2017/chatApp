const users: any = [];
// join user to chat
export function userJoin(id: string, username: string, room: string) {
    const user = { id, username, room };

    //@ts-ignore
    users.push(user);

    return user;
}

// get current user
export function getCurrentUser(id: string) {
    //@ts-ignore
    return users.find(user => user.id === id);
}

// user leaves chat
export function userLeave(id: string) {
    //@ts-ignore
    const index = users.findIndex(user => user.id === id);

    if (index !== -1) {
        return users.splice(index, 1)[0];
    }
}

// get room users
export function getRoomUsers(room: string) {
    //@ts-ignore
    return users.filter(user => user.room === room);
}