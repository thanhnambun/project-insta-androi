import { PostRequest, PostResponse } from "@/interfaces/post.interface";
import {
    createPost,
    fetchFeeds,
    fetchOtherPosts,
    fetchOwnPosts,
    fetchPostDetail,
    togglePostReaction,
} from "@/services/post.service";
import { BaseResponse, SingleResponse } from "@/utils/response-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const POST_KEY = ["posts"];

export const useOwnPostsQuery = () => {
  return useQuery<BaseResponse<PostResponse>>({
    queryKey: [...POST_KEY, "own"],
    queryFn: fetchOwnPosts,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

export const useFeedsQuery = () => {
  return useQuery<BaseResponse<PostResponse>>({
    queryKey: [...POST_KEY, "feeds"],
    queryFn: fetchFeeds,
    staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache for 30 minutes (formerly cacheTime)
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};

export const useOtherPostsQuery = (userId: number) => {
  return useQuery<BaseResponse<PostResponse>>({
    queryKey: [...POST_KEY, "other", userId],
    queryFn: () => fetchOtherPosts(userId),
    enabled: !!userId,
  });
};

export const useCreatePostMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<SingleResponse<PostResponse>, unknown, PostRequest>({
    mutationFn: (post) => createPost(post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...POST_KEY, "own"] });
      queryClient.invalidateQueries({ queryKey: [...POST_KEY, "feeds"] });
    },
  });

};


const updatePostReactionInCache = (
  queryClient: any,
  queryKey: any[],
  postId: number
) => {
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData) return oldData;
    
    // Handle array responses (feeds, own posts, other posts)
    if (oldData.data && Array.isArray(oldData.data)) {
      return {
        ...oldData,
        data: oldData.data.map((post: PostResponse) =>
          post.id === postId
            ? {
                ...post,
                reactedByCurrentUser: !post.reactedByCurrentUser,
                totalReactions: post.reactedByCurrentUser
                  ? Math.max(0, post.totalReactions - 1)
                  : post.totalReactions + 1,
              }
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
          reactedByCurrentUser: !oldData.data.reactedByCurrentUser,
          totalReactions: oldData.data.reactedByCurrentUser
            ? Math.max(0, oldData.data.totalReactions - 1)
            : oldData.data.totalReactions + 1,
        },
      };
    }
    
    return oldData;
  });
};

export const useTogglePostReactionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    SingleResponse<void>,
    unknown,
    { postId: number }
  >({
    mutationFn: ({ postId }) => togglePostReaction(postId),
    onSuccess: (_, variables) => {
      // Update all post query caches to keep reaction state consistent
      updatePostReactionInCache(
        queryClient,
        [...POST_KEY, "feeds"],
        variables.postId
      );
      updatePostReactionInCache(
        queryClient,
        [...POST_KEY, "own"],
        variables.postId
      );
      // Update post detail cache if it exists
      updatePostReactionInCache(
        queryClient,
        [...POST_KEY, "post", variables.postId],
        variables.postId
      );
      // Update other posts caches (need to invalidate pattern match for all user posts)
      queryClient.invalidateQueries({
        queryKey: [...POST_KEY, "other"],
        exact: false,
      });
    },
  });
};

export const usePostDetailQuery = (postId: number) => {
  return useQuery<SingleResponse<PostResponse>>({
    queryKey: [...POST_KEY, "post", postId],
    queryFn: () => fetchPostDetail(postId),
    enabled: !!postId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};