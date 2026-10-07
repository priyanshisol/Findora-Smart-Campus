/**
 * Notification System Controller
 */

async function loadUserNotifications() {
  if (!currentUser) return;

  try {
    const res = await NotificationAPI.getAll();
    if (!res.success) return;

    const unreadBadge = document.getElementById('navNotifBadge');
    if (unreadBadge) {
      if (res.unreadCount > 0) {
        unreadBadge.textContent = res.unreadCount;
        unreadBadge.style.display = 'inline-block';
      } else {
        unreadBadge.style.display = 'none';
      }
    }

    const container = document.getElementById('notifDropdownList');
    if (!container) return;

    if (res.notifications.length > 0) {
      container.innerHTML = res.notifications.map((n) => `
        <div class="p-3 border-bottom notif-item ${n.isRead ? 'bg-body' : 'bg-primary-subtle'}" onclick="handleNotificationClick('${n._id}', '${n.relatedItem ? (n.relatedItem._id || n.relatedItem) : ''}')">
          <div class="d-flex align-items-start gap-2">
            <i class="bi ${n.type === 'match' ? 'bi-lightning-charge-fill text-warning' : n.type === 'claim_update' ? 'bi-check-circle-fill text-success' : 'bi-bell-fill text-primary'} mt-1"></i>
            <div class="flex-grow-1">
              <div class="fs-7 text-main mb-1" style="line-height:1.3;">${n.message}</div>
              <div class="text-muted fs-8">${formatRelativeTime(n.createdAt)}</div>
            </div>
            ${!n.isRead ? '<span class="badge bg-primary p-1 rounded-circle" style="width:8px; height:8px;"></span>' : ''}
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = `<div class="p-4 text-center text-muted fs-7">No notifications</div>`;
    }
  } catch (err) {
    console.warn('Unable to load notifications:', err);
  }
}

async function handleNotificationClick(notifId, itemId) {
  try {
    await NotificationAPI.markAsRead(notifId);
    await loadUserNotifications();
    if (itemId) {
      viewItemDetails(itemId);
    }
  } catch (err) {
    console.error('Error handling notification click:', err);
  }
}

async function handleMarkAllNotificationsRead() {
  try {
    await NotificationAPI.markAllAsRead();
    showToast('All notifications marked as read', 'success');
    await loadUserNotifications();
  } catch (err) {
    showToast('Error marking notifications as read', 'danger');
  }
}
