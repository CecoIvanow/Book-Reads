import { Book } from "./book.model.js";
import { CommentType } from "./comment.model.js";
import { Like } from "./like.model.js";

export type BookPageDetails = [Book, number, Like[], CommentType[]];