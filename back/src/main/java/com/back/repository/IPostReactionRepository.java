package com.back.repository;

import com.back.model.entity.PostReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface IPostReactionRepository extends JpaRepository<PostReaction, Long> {

    Optional<PostReaction> findByPostIdAndUserId(Long postId, Long userId);

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    @Query("SELECT pr.post.id, COUNT(pr) FROM PostReaction pr WHERE pr.post.id IN :postIds GROUP BY pr.post.id")
    List<Object[]> countReactionsByPostIds(@Param("postIds") List<Long> postIds);

    @Query("SELECT pr.post.id FROM PostReaction pr WHERE pr.post.id IN :postIds AND pr.user.id = :userId")
    Set<Long> findPostIdsReactedByUser(@Param("postIds") List<Long> postIds, @Param("userId") Long userId);
}
