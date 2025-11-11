import { useProfileQuery } from "@/hooks/useAccount";
import {
  COMMENT_KEY,
  useCommentsByPostQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useToggleCommentReactionMutation,
} from "@/hooks/useComment";
import {
  POST_KEY,
  usePostDetailQuery,
  useTogglePostReactionMutation,
} from "@/hooks/usePost";
import { CommentResponse } from "@/interfaces/comment.interface";
import { Feather } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { ResizeMode, Video } from "expo-av";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const PostDetailScreen = () => {
  const route = useRoute<any>();
  const postId = Number(route.params?.postId || route.params?.id || 0);

  const queryClient = useQueryClient();

  const { data: postDetail } = usePostDetailQuery(postId);
  const { data: commentsData } = useCommentsByPostQuery(postId);
  const { data: profileData } = useProfileQuery();

  const createComment = useCreateCommentMutation();
  const deleteComment = useDeleteCommentMutation();
  const toggleCommentReaction = useToggleCommentReactionMutation();
  const togglePostReaction = useTogglePostReactionMutation();

  const currentUser = profileData?.data;
  const post = postDetail?.data;

  // --- build tree comments + tính tổng bình luận (kể cả reply) ---
  const { roots, totalComments } = useMemo(() => {
    const list = commentsData?.data ?? [];
    const map = new Map<
      number,
      CommentResponse & { childComments: CommentResponse[] }
    >();
    list.forEach((c) => map.set(c.id, { ...c, childComments: [] }));

    const _roots: (CommentResponse & { childComments: CommentResponse[] })[] =
      [];
    list.forEach((c) => {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.childComments.push(map.get(c.id)!);
      } else {
        _roots.push(map.get(c.id)!);
      }
    });
    return { roots: _roots, totalComments: list.length };
  }, [commentsData]);

  const [newComment, setNewComment] = useState("");

  // --------- Optimistic updates (không "mất" số sau reload) ----------
  const handleTogglePostReaction = () => {
    // Optimistic update cho post detail - use correct query key
    const postDetailQueryKey = [...POST_KEY, "post", postId];
    queryClient.setQueryData(postDetailQueryKey, (old: any) => {
      if (!old?.data) return old;
      const reacted = !old.data.reactedByCurrentUser;
      const total = old.data.totalReactions + (reacted ? 1 : -1);
      return {
        ...old,
        data: {
          ...old.data,
          reactedByCurrentUser: reacted,
          totalReactions: Math.max(0, total),
        },
      };
    });
    togglePostReaction.mutate(
      { postId },
      {
        onError: () =>
          queryClient.invalidateQueries({ queryKey: postDetailQueryKey }),
        onSettled: () =>
          queryClient.invalidateQueries({ queryKey: postDetailQueryKey }),
      }
    );
  };

  const handleAddComment = (parentId?: number | null) => {
    if (!newComment.trim()) return;

    // Optimistic: đẩy tạm 1 comment (id âm tạm thời) + tăng tổng số
    const commentsQueryKey = [...COMMENT_KEY, "post", postId];
    const postDetailQueryKey = [...POST_KEY, "post", postId];
    const tempId = -Date.now();
    queryClient.setQueryData(commentsQueryKey, (old: any) => {
      const me = currentUser || { id: 0, username: "me", avatarUrl: "" };
      const optimistic = {
        id: tempId,
        postId,
        parentId: parentId ?? null,
        content: newComment,
        user: me,
        reactedByCurrentUser: false,
        reactionCount: 0,
        replyToUsername: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { ...old, data: [...(old?.data ?? []), optimistic] };
    });

    setNewComment("");
    createComment.mutate(
      { content: newComment, postId, parentId },
      {
        onSuccess: () => {
          // đảm bảo số lượng & danh sách đúng từ server
          queryClient.invalidateQueries({ queryKey: commentsQueryKey });
        },
        onError: () => {
          // rollback nếu fail
          queryClient.invalidateQueries({ queryKey: commentsQueryKey });
        },
        onSettled: () => {
          // nếu API có trả `totalComments` trong post detail, refetch nó
          queryClient.invalidateQueries({ queryKey: postDetailQueryKey });
        },
      }
    );
  };

  const handleDeleteComment = (commentId: number) => {
    // Optimistic: xóa tạm trong cache
    const commentsQueryKey = [...COMMENT_KEY, "post", postId];
    const postDetailQueryKey = [...POST_KEY, "post", postId];
    queryClient.setQueryData(commentsQueryKey, (old: any) => {
      if (!old?.data) return old;
      return { ...old, data: old.data.filter((c: any) => c.id !== commentId) };
    });
    deleteComment.mutate(
      { commentId, postId },
      {
        onError: () =>
          queryClient.invalidateQueries({ queryKey: commentsQueryKey }),
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: commentsQueryKey });
          queryClient.invalidateQueries({ queryKey: postDetailQueryKey });
        },
      }
    );
  };

  const handleToggleCommentReaction = (commentId: number) => {
    // Optimistic: đổi icon/đếm
    const commentsQueryKey = [...COMMENT_KEY, "post", postId];
    queryClient.setQueryData(commentsQueryKey, (old: any) => {
      if (!old?.data) return old;
      const data = old.data.map((c: any) =>
        c.id === commentId
          ? {
              ...c,
              reactedByCurrentUser: !c.reactedByCurrentUser,
              reactionCount: Math.max(
                0,
                c.reactionCount + (c.reactedByCurrentUser ? -1 : 1)
              ),
            }
          : c
      );
      return { ...old, data };
    });
    toggleCommentReaction.mutate(
      { commentId, postId },
      {
        onSettled: () =>
          queryClient.invalidateQueries({ queryKey: commentsQueryKey }),
      }
    );
  };

  const CommentText = ({ text }: { text: string }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text || text.length <= 100)
      return <Text style={styles.commentText}>{text}</Text>;
    return (
      <Text style={styles.commentText}>
        {expanded ? text : text.slice(0, 100) + "..."}
        <Text style={styles.seeMore} onPress={() => setExpanded(!expanded)}>
          {expanded ? " Ẩn bớt" : " Xem thêm"}
        </Text>
      </Text>
    );
  };

  const Reply = ({ reply }: { reply: CommentResponse }) => (
    <View style={styles.replyItem}>
      <Image
        source={{ uri: reply.user.avatarUrl }}
        style={styles.commentAvatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.commentUsername}>{reply.user.username}</Text>
        {reply.replyToUsername && (
          <Text style={styles.replyToText}>
            Trả lời {reply.replyToUsername}
          </Text>
        )}
        <CommentText text={reply.content} />
        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.reactionRow}
            onPress={() => handleToggleCommentReaction(reply.id)}
          >
            <Feather
              name="heart"
              size={16}
              color={reply.reactedByCurrentUser ? "red" : "gray"}
            />
            <Text style={styles.reactionCount}>{reply.reactionCount}</Text>
          </TouchableOpacity>
          {reply.user.username === currentUser?.username && (
            <TouchableOpacity onPress={() => handleDeleteComment(reply.id)}>
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
  }) => (
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
            onPress={() => handleToggleCommentReaction(item.id)}
          >
            <Feather
              name="heart"
              size={16}
              color={item.reactedByCurrentUser ? "red" : "gray"}
            />
            <Text style={styles.reactionCount}>{item.reactionCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setNewComment(`@${item.user.username} `)}
          >
            <Text style={styles.replyText}>Trả lời</Text>
          </TouchableOpacity>
          {item.user.username === currentUser?.username && (
            <TouchableOpacity onPress={() => handleDeleteComment(item.id)}>
              <Text style={styles.deleteText}>Xoá</Text>
            </TouchableOpacity>
          )}
        </View>
        {item.childComments?.map((r) => (
          <Reply key={r.id} reply={r} />
        ))}
      </View>
    </View>
  );

  if (!post)
    return (
      <SafeAreaView>
        <Text style={{ padding: 16 }}>Đang tải…</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      {/* <StatusBar barStyle="dark-content" /> */}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={roots}
          renderItem={renderComment}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={
            <>
              {/* Header bài viết */}
              <View style={styles.postHeader}>
                <Image
                  source={{ uri: post.user.avatarUrl }}
                  style={styles.avatar}
                />
                <Text style={styles.username}>{post.user.username}</Text>
              </View>

              {post.mediaList[0]?.type === "IMAGE" ? (
                <Image
                  source={{ uri: post.mediaList[0].url }}
                  style={styles.postImage}
                />
              ) : (
                <Video
                  source={{ uri: post.mediaList[0].url }}
                  style={styles.postImage}
                  resizeMode={ResizeMode.COVER}
                  useNativeControls
                />
              )}

              <View style={styles.postActions}>
                <TouchableOpacity onPress={handleTogglePostReaction}>
                  <Feather
                    name="heart"
                    size={24}
                    color={post.reactedByCurrentUser ? "red" : "black"}
                  />
                </TouchableOpacity>
                <Text style={styles.reactionCountText}>
                  {post.totalReactions} lượt thích
                </Text>
              </View>

              <View style={styles.captionContainer}>
                <Text style={styles.captionUsername}>{post.user.username}</Text>
                <Text style={styles.captionText}>{post.content}</Text>
              </View>

              <Text style={styles.commentHeader}>
                Bình luận ({post.totalComments ?? totalComments})
              </Text>
            </>
          }
          contentContainerStyle={{ paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Input bar bám đáy */}
        <SafeAreaView edges={["bottom"]} style={styles.inputSafe}>
          <View style={styles.inputRow}>
            <Image
              source={{ uri: currentUser?.avatarUrl }}
              style={styles.inputAvatar}
            />
            <TextInput
              style={styles.input}
              placeholder="Thêm bình luận..."
              value={newComment}
              onChangeText={setNewComment}
              returnKeyType="send"
              onSubmitEditing={() => handleAddComment()}
            />
            <TouchableOpacity onPress={() => handleAddComment()}>
              <Feather name="send" size={22} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  postHeader: { flexDirection: "row", alignItems: "center", padding: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  username: { fontWeight: "bold", fontSize: 16 },
  postImage: { width: "100%", height: 420, backgroundColor: "#000" },
  postActions: { flexDirection: "row", alignItems: "center", padding: 12 },
  reactionCountText: { marginLeft: 10, color: "#555" },
  captionContainer: { paddingHorizontal: 12, paddingBottom: 8 },
  captionUsername: { fontWeight: "bold" },
  captionText: { marginTop: 4 },

  commentHeader: {
    fontWeight: "600",
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    fontSize: 16,
  },

  commentItem: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  replyItem: { flexDirection: "row", paddingVertical: 8, paddingLeft: 52 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  commentUsername: { fontWeight: "bold" },
  commentText: { fontSize: 14, lineHeight: 19, marginTop: 2 },
  seeMore: { color: "#007AFF" },
  replyToText: { fontSize: 12, color: "#777" },
  commentActions: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  reactionRow: { flexDirection: "row", alignItems: "center" },
  reactionCount: { marginLeft: 4, fontSize: 12, color: "gray" },
  replyText: { marginLeft: 12, color: "#007AFF", fontSize: 12 },
  deleteText: { marginLeft: 12, color: "red", fontSize: 12 },

  inputSafe: {
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  input: {
    flex: 1,
    height: 38,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 14,
    marginRight: 8,
  },
});
