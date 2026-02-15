import { useMemo, useState } from "react";
import { Layout } from "./Layout";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Bell, CheckCircle2, Clock, MessageSquare, Trash2, Archive } from "lucide-react";
import { useNotifications } from "../contexts/NotificationContext";

interface NotificationCenterProps {
  onNavigate: (page: string) => void;
}

function formatDistanceToNow(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => !dismissedIds.includes(n.id)),
    [notifications, dismissedIds],
  );

  const unreadNotifications = visibleNotifications.filter((n) => !n.read);
  const readNotifications = visibleNotifications.filter((n) => n.read);

  const deleteNotification = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const NotificationItem = ({ notification }: { notification: (typeof notifications)[number] }) => (
    <div
      className={`p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
        notification.read
          ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      }`}
      onClick={() => void markAsRead(notification.id)}
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-2 rounded-lg ${
            notification.read ? "bg-gray-100 dark:bg-gray-700" : "bg-white dark:bg-gray-800"
          }`}
        >
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 dark:text-white">{notification.title}</h4>
            {!notification.read && <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{notification.message}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(notification.createdAt)}
            </span>
            <div className="flex items-center gap-2">
              {notification.feedbackId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate("my-feedback");
                  }}
                >
                  View Feedback
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout title="Notification Center">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                  <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {unreadNotifications.length} unread notification{unreadNotifications.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void markAllAsRead()}
                disabled={unreadNotifications.length === 0}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark all as read
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="all">All ({visibleNotifications.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadNotifications.length})</TabsTrigger>
            <TabsTrigger value="read">Read ({readNotifications.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 mt-6">
            {visibleNotifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No notifications</h3>
                  <p className="text-gray-500 dark:text-gray-400">You're all caught up!</p>
                </CardContent>
              </Card>
            ) : (
              visibleNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))
            )}
          </TabsContent>

          <TabsContent value="unread" className="space-y-3 mt-6">
            {unreadNotifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">All caught up!</h3>
                  <p className="text-gray-500 dark:text-gray-400">You have no unread notifications</p>
                </CardContent>
              </Card>
            ) : (
              unreadNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))
            )}
          </TabsContent>

          <TabsContent value="read" className="space-y-3 mt-6">
            {readNotifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Archive className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No read notifications</h3>
                  <p className="text-gray-500 dark:text-gray-400">Your read notifications will appear here</p>
                </CardContent>
              </Card>
            ) : (
              readNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
