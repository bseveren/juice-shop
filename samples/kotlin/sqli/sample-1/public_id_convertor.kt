package data
 
import jakarta.enterprise.context.ApplicationScoped
import jakarta.inject.Inject
import jakarta.persistence.EntityManager

@ApplicationScoped
class PublicIdConverter : IPublicIdConverter {

    @Inject
    private lateinit var entityManager: EntityManager

    override fun convert(publicId: PublicId): Int {
        val query = "SELECT id FROM ${publicId.prefix().dbTable} WHERE public_id = '${publicId.id}'"
        val result = entityManager.createNativeQuery(query)
        if (result.resultList.isEmpty()) {
            throw PublicIdNotFoundException(publicId = publicId)
        }
        val singleResult = result.singleResult
        if (singleResult != null) {
            return (singleResult as Number).toInt()
        } else {
            throw PublicIdNotFoundException(publicId = publicId)
        }
    }
}