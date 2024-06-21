import { gql, useMutation, useQuery } from "@apollo/client";
import { useEffect } from "react";

const GET_POST = gql`
  query GET_POST($id: Int!) {
    getPost(id: $id) {
      id
      name
      comments {
        id
        name
      }
    }
  }
`;

const NEW_COMMENT = gql`
  subscription NEW_COMMENT($postId: Int!) {
    newComment(postId: $postId) {
      id
      name
    }
  }
`;

const CREATE_COMMENT = gql`
  mutation CREATE_COMMENT {
    createComment {
      id
      name
    }
  }
`;

export const Post = () => {
  const [createComment] = useMutation(CREATE_COMMENT);

  const { data, loading, subscribeToMore } = useQuery(GET_POST, {
    variables: { id: 1 },
  });

  useEffect(() => {
    const unsubscribe = subscribeToMore({
      document: NEW_COMMENT,
      variables: { postId: 1 },
      updateQuery: (prev, { subscriptionData }) => {
        console.log("prev", prev);

        if (!subscriptionData.data) {
          return prev;
        }

        const { newComment } = subscriptionData.data;

        console.log("newComment", newComment);

        return Object.assign({}, prev, {
          getPost: {
            ...prev.getPost,
            comments: [newComment, ...(prev.getPost.comments || [])],
          },
        });
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSubmit = async () => {
    await createComment();
  };

  return (
    <div>
      {loading && "Loading..."}
      <h1>{data?.getPost.name}</h1>
      <ol>
        {data?.getPost.comments.map((c: any) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ol>
      <button onClick={handleSubmit}> Create a comment</button>
    </div>
  );
};
