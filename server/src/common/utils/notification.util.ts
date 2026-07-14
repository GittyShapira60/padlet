import { NotificationDocument } from '../../entities'

export function mapNotification(n: NotificationDocument) {
  return {
    id: n.id,
    username: n.username,
    type: n.type,
    message: n.message,
    board_id: n.boardId,
    board_title: n.boardTitle,
    read: n.read,
    created_at: n.createdAt,
  }
}
