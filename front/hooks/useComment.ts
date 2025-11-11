import {
    CommentRequest,
    CommentResponse,
} from "@/interfaces/comment.interface";
import {
    createComment,
    deleteComment,
    fetchCommentsByPostId,
    toggleCommentReaction,
} from "@/services/comment.service";
import { BaseResponse } from "@/utils/response-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { POST_KEY } from "./usePost";

export const COMMENT_KEY = ["comments"];

export const useCommentsByPostQuery = (postId: number) => {
  return useQuery<BaseResponse<CommentResponse>>({
    queryKey: [...COMMENT_KEY, "post", postId],
    queryFn: () => fetchCommentsByPostId(postId),
    enabled: !!postId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

const updateCommentCountInCache = (
  queryClient: any,
  queryKey: any[],
  postId: number,
  increment: number
) => {
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData) return oldData;
    
    // Handle array responses (feeds, own posts, other posts)
    if (oldData.data && Array.isArray(oldData.data)) {
      return {
        ...oldData,
        data: oldData.data.map((post: any) =>
          post.id === postId
            ? { ...post, totalComments: Math.max(0, (post.totalComments || 0) + increment) }
            : post
        ),
      };
    }
    
    // Handle single post response (post detail)
    if (oldData.data && oldData.data.id === postId) {
      return {
        ...oldData,
        data: {
          ...oldData.data,
          totalComments: Math.max(0, (oldData.data.totalComments || 0) + increment),
        },
      };
    }
    
    return oldData;
  });
};

export const useCreateCommentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentRequest: CommentRequest) =>
      createComment(commentRequest),
    onSuccess: (data, variables) => {
      if (!variables.postId) return;
      
      queryClient.invalidateQueries({
        queryKey: [...COMMENT_KEY, "post", variables.postId],
      });
      
      // Update comment count in all post query caches
      updateCommentCountInCache(queryClient, [...POST_KEY, "feeds"], variables.postId, 1);
      updateCommentCountInCache(queryClient, [...POST_KEY, "own"], variables.postId, 1);
      updateCommentCountInCache(queryClient, [...POST_KEY, "post", variables.postId], variables.postId, 1);
      // Update other posts caches
      queryClient.invalidateQueries({
        queryKey: [...POST_KEY, "other"],
        exact: false,
      });
    },
  });
};

export const useDeleteCommentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId }: { commentId: number; postId: number }) =>
      deleteComment(commentId),
    onSuccess: (_, variables) => {
      if (!variables.postId) return;
      
      queryClient.invalidateQueries({
        queryKey: [...COMMENT_KEY, "post", variables.postId],
      });
      
      // Update comment count in all post query caches
      updateCommentCountInCache(queryClient, [...POST_KEY, "feeds"], variables.postId, -1);
      updateCommentCountInCache(queryClient, [...POST_KEY, "own"], variables.postId, -1);
      updateCommentCountInCache(queryClient, [...POST_KEY, "post", variables.postId], variables.postId, -1);
      // Update other posts caches
      queryClient.invalidateQueries({
        queryKey: [...POST_KEY, "other"],
        exact: false,
      });
    },
  });
};

export const useToggleCommentReactionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId }: { commentId: number; postId: number }) =>
      toggleCommentReaction(commentId),
    onSuccess: (_, variables) => {
      // Only invalidate comments query to refresh comment reactions
      // Don't touch feed queries to avoid resetting post reaction states
      queryClient.invalidateQueries({
        queryKey: [...COMMENT_KEY, "post", variables.postId],
      });
    },
  });
};
