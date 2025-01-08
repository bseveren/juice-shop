import axios from "axios";
import { trackPromise } from "react-promise-tracker";
import Routes from "../../js-routes/index.js.erb";
import { deepFind, permit } from "../../utils.jsx";

const taskParams = (task) => {
  const ret = permit(task, [
    "id",
    "survey_fill_out_answer_id",
    "title",
    "description",
    "completed",
  ]);

  ret.user_ids = task.users.map((u) => u.id);
  return ret;
};

const saveTask = (task) => {
  trackPromise(
    axios.patch(
      Routes.surveyFillOutAnswerTaskPath(
        task.survey_fill_out_answer_id,
        task.id,
        {
          format: "json",
        },
      ),
      { survey_fill_out_answer_task: taskParams(task) },
    ),
    `${task.survey_fill_out_answer_id}_answer_area`,
  );
};

const destroyTask = (task) => {
  axios.delete(
    Routes.surveyFillOutAnswerTaskPath(
      task.survey_fill_out_answer_id,
      task.id,
      {
        format: "json",
      },
    ),
  );
};

export default (data) => {
  if (data.value === undefined && typeof data.previous === "object") {
    return destroyTask(data.previous);
  }

  // The task data is the existing data in the path or the data.value / merged when a new task is added.
  // the merged value is the value when using the merge function, value for the set function
  const task =
    data.path.length === 5 && data.previous.length === data.value.length - 1
      ? (data.merged && data.merged[0]) || data.value[0]
      : deepFind(data.state, data.path.slice(0, 6));

  return saveTask(task);
};
