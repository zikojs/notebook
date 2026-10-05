import { tags } from "ziko/dom"
export const ErrorOutput = (err) => tags.div({ class: "error-output" }, err.toString())