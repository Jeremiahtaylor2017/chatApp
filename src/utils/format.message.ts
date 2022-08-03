import moment from 'moment';

export default function formatMessage(username: string, text: string) {
    return {
        username,
        text,
        time: moment().format('h:mm a')
    }
}