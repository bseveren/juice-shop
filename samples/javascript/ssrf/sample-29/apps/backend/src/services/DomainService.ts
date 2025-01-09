export default class DomainService {
  static async fetchDashboardDomain(query: FetchDomainsQuery): Promise<Domains.DomainContext | null> {
    const url = getDomainsURL() + "/api/domains/dashboard?" + Utils.objectToQueryString(query)
    const response = await fetch(url)

    if (!response.ok) throw new Error("Domain Service Error: " + response.statusText)
    return response.status === 200 ? await response.json() : null
  }
}
