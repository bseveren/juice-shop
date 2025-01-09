export function getComments(id) {
  return axios.get(Routes.recommendedResourceComments(id));
}
