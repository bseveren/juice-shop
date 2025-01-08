public class OrganizationRepository
{
    public static bool DoesOrganizationExist(string policyNumber, string relationNumber, ref int? organizationId)
    {
        using (AbsenceContext absenceDb = new AbsenceContext())
        {
            int? foundOrgId = null;
            foundOrgId = absenceDb.Database
                .SqlQuery<int?>("SELECT top 1 organizationId FROM Absence.Insurance WHERE policyNumber = '" +
                                policyNumber + "' OR relationNumber = '" + relationNumber + "'").FirstOrDefault();
            if (foundOrgId.HasValue)
            {
                organizationId = foundOrgId.Value;
                return true;
            }
            else
                return false;
        }
    }
}
