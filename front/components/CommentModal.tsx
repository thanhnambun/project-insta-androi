import { useProfileQuery } from "@/hooks/useAccount";
import {
  useCommentsByPostQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useToggleCommentReactionMutation,
} from "@/hooks/useComment";
import { CommentResponse } from "@/interfaces/comment.interface";
import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  postId: number;
}

export const CommentModal = ({
  visible,
  onClose,
  postId,
}: CommentModalProps) => {
  // Only fetch comments when modal is visible
  const { data, isLoading, error } = useCommentsByPostQuery(postId);
  const { data: profileData } = useProfileQuery();
  const createComment = useCreateCommentMutation();
  const deleteComment = useDeleteCommentMutation();
  const toggleReaction = useToggleCommentReactionMutation();

  const currentUser = profileData?.data;
  const [newComment, setNewComment] = useState("");

  const comments = useMemo(() => {
    if (!data?.data) return [];

    const map = new Map<
      number,
      CommentResponse & { childComments: CommentResponse[] }
    >();
    data.data.forEach((c) => {
      map.set(c.id, { ...c, childComments: [] });
    });

    const roots: (CommentResponse & { childComments: CommentResponse[] })[] =
      [];

    data.data.forEach((c) => {
      if (c.parentId && map.has(c.parentId)) {
        const parent = map.get(c.parentId)!;
        parent.childComments.push(map.get(c.id)!);
      } else {
        roots.push(map.get(c.id)!);
      }
    });

    return roots;
  }, [data]);

  const handleAddComment = (parentId?: number | null) => {
    if (!newComment.trim() || !currentUser) return;
    createComment.mutate({ content: newComment, postId, parentId });
    setNewComment("");
  };

  const CommentText = ({ text }: { text: string }) => {
    const [expanded, setExpanded] = useState(false);
    const toggleExpand = () => setExpanded(!expanded);
    if (text.length <= 100)
      return <Text style={styles.commentText}>{text}</Text>;
    return (
      <Text style={styles.commentText}>
        {expanded ? text : text.slice(0, 100) + "..."}
        <Text style={{ color: "#007AFF" }} onPress={toggleExpand}>
          {expanded ? " Ẩn bớt" : " Xem thêm"}
        </Text>
      </Text>
    );
  };

  const renderReply = (reply: CommentResponse) => (
    <View key={reply.id} style={styles.replyItem}>
      <Image
        source={{ uri: reply.user.avatarUrl }}
        style={styles.commentAvatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.commentUsername}>{reply.user.username}</Text>
        {reply.replyToUsername && (
          <Text style={{ fontSize: 12, color: "#8e8e8e", marginBottom: 2 }}>
            Trả lời{" "}
            <Text style={{ fontWeight: "600" }}>{reply.replyToUsername}</Text>
          </Text>
        )}
        <CommentText text={reply.content} />
        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.reactionRow}
            onPress={() =>
              toggleReaction.mutate({ commentId: reply.id, postId })
            }
          >
            <Feather
              name="heart"
              size={16}
              color={reply.reactedByCurrentUser ? "red" : "gray"}
            />
            <Text style={styles.reactionCount}>{reply.reactionCount || 0}</Text>
          </TouchableOpacity>
          {reply.user.username === currentUser?.username && (
            <TouchableOpacity
              onPress={() =>
                deleteComment.mutate({ commentId: reply.id, postId })
              }
              style={{ marginLeft: 12 }}
            >
              <Text style={styles.deleteText}>Xoá</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderComment = ({
    item,
  }: {
    item: CommentResponse & { childComments?: CommentResponse[] };
  }) => {
    return (
      <View style={styles.commentItem}>
        <Image
          source={{ uri: item.user.avatarUrl }}
          style={styles.commentAvatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.commentUsername}>{item.user.username}</Text>
          <CommentText text={item.content} />
          <View style={styles.commentActions}>
            <TouchableOpacity
              style={styles.reactionRow}
              onPress={() =>
                toggleReaction.mutate({ commentId: item.id, postId })
              }
            >
              <Feather
                name="heart"
                size={16}
                color={item.reactedByCurrentUser ? "red" : "gray"}
              />
              <Text style={styles.reactionCount}>
                {item.reactionCount || 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAddComment(item.id)}
              style={{ marginLeft: 12 }}
            >
              <Text style={styles.replyText}>Trả lời</Text>
            </TouchableOpacity>
            {item.user.username === currentUser?.username && (
              <TouchableOpacity
                onPress={() =>
                  deleteComment.mutate({ commentId: item.id, postId })
                }
                style={{ marginLeft: 12 }}
              >
                <Text style={styles.deleteText}>Xoá</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Render replies */}
          {item.childComments?.map((reply) => renderReply(reply))}
        </View>
      </View>
    );
  };

  return (
      <Modal
        animationType="fade"
        visible={visible}
        transparent={false}
        onRequestClose={onClose}
      >
        {/* <StatusBar hidden={false} /> */}
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          >
            <View style={styles.header}>
              <Text style={styles.headerText}>Bình luận</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeText}>Đóng</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.centerContainer}>
                <Text>Đang tải bình luận...</Text>
              </View>
            ) : error ? (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Không thể tải bình luận</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderComment}
                contentContainerStyle={{ paddingBottom: 80 }}
                ListEmptyComponent={
                  <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>Chưa có bình luận nào</Text>
                  </View>
                }
              />
            )}

            {currentUser && (
              <SafeAreaView edges={["bottom"]} style={styles.inputContainer}>
                <View style={styles.inputRow}>
                  <Image
                    source={{ uri: currentUser.avatarUrl }}
                    style={styles.inputAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.input}
                      placeholder="..."
                      placeholderTextColor="#8e8e8e"
                      value={newComment}
                      onChangeText={setNewComment}
                      multiline
                      textAlignVertical="center"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => handleAddComment()}
                    disabled={!newComment.trim()}
                    style={{
                      opacity: newComment.trim() ? 1 : 0.3,
                      padding: 4,
                    }}
                  >
                    <Feather
                      name="send"
                      size={20}
                      color={newComment.trim() ? "#0095f6" : "#8e8e8e"}
                    />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    marginTop: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  closeText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },

  commentItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  replyItem: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingLeft: 58,
    paddingRight: 16,
    alignItems: "flex-start",
    backgroundColor: "#fafafa",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: "#e0e0e0",
  },
  commentUsername: {
    fontWeight: "600",
    marginBottom: 4,
    fontSize: 14,
    color: "#000",
  },
  commentText: {
    fontSize: 14,
    color: "#262626",
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  reactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  reactionCount: {
    marginLeft: 6,
    color: "#8e8e8e",
    fontSize: 12,
    fontWeight: "400",
  },
  deleteText: {
    color: "#ed4956",
    fontSize: 12,
    fontWeight: "500",
  },
  replyText: {
    color: "#8e8e8e",
    fontSize: 12,
    fontWeight: "500",
  },

  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e0e0e0",
    marginRight: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 36,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 14,
    backgroundColor: "#fafafa",
    color: "#000",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  errorText: {
    color: "#ed4956",
    fontSize: 14,
    fontWeight: "500",
  },
  emptyText: {
    color: "#8e8e8e",
    fontSize: 14,
  },
});
