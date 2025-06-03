import acme.business.cmis.FileUploadValidator;
import acme.business.interfaces.TenantManager;
import acme.constants.CachingConstants;
import acme.exceptions.LanguageNotEnabledException;
import acme.exceptions.NotificationAdapterTypeException;
import acme.exceptions.ValidationErrorObject;
import acme.exceptions.ValidationException;
import acme.model.configuration.FileUploadConfiguration;
import acme.model.configuration.Language;
import acme.model.configuration.MailConfiguration;
import acme.model.configuration.MonitoringConfiguration;
import acme.model.security.DefaultAccountConfiguration;
import acme.model.security.Tenant;
import acme.model.security.permission.TenantPermission;
import acme.model.security.permission.TenantPermission.TenantAction;
import acme.repository.security.TenantRepository;
import acme.security.TenantContext;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static java.util.stream.Collectors.toList;

@Service
@Transactional(readOnly = true)
public class TenantManagerImpl extends ManagerImpl implements TenantManager {

    private final TenantRepository tenantRepository;
    private final FileUploadValidator fileUploadValidator;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    public TenantManagerImpl(TenantRepository tenantRepository,
                             FileUploadValidator fileUploadValidator) {
        this.tenantRepository = tenantRepository;
        this.fileUploadValidator = fileUploadValidator;
    }

    @Override
    public List<Tenant> getTenants() {
        return tenantRepository.findAll().stream()
                .filter(tenant -> currentSubject().isPermitted(new TenantPermission(tenant.getId(), TenantAction.VIEW)))
                .collect(toList());
    }

    @Override
    public Tenant getCurrentTenant() {
        Tenant tenant = TenantContext.getCurrentTenant();
        currentSubject().checkPermission(new TenantPermission(tenant.getId(), TenantAction.VIEW));
        return tenant;
    }

    @Override
    @Transactional
    @CacheEvict(value = CachingConstants.ENABLED_LANGUAGES, key = "#tenant.getId()")
    public void updateTenant(Tenant tenant, Language oldLanguage, Language newLanguage) {
        currentSubject().checkPermission(new TenantPermission(tenant.getId(), TenantAction.UPDATE));
        languageValidation(tenant, newLanguage);
        copyMissingTranslationsIfNeeded(oldLanguage, newLanguage);
        tenantRepository.saveAndFlush(tenant);
    }

    @Override
    @Transactional
    public void updateTenant(Tenant tenant) {
        currentSubject().checkPermission(new TenantPermission(tenant.getId(), TenantAction.UPDATE));
        tenantRepository.save(tenant);
    }

    @Override
    @Transactional
    public void createOrUpdateMailConfiguration(Tenant tenant, MailConfiguration mailConfiguration) {
        notificationAdapterTypeCheck(mailConfiguration);
        if (tenant.getMailConfiguration() != null) {
            MailConfiguration existing = tenant.getMailConfiguration();
            existing.setAdapterConfiguration(mailConfiguration.getAdapterConfiguration());
            existing.setHostname(mailConfiguration.getHostname());
            existing.setPort(mailConfiguration.getPort());
            existing.setFromMailAddress(mailConfiguration.getFromMailAddress());
            existing.setUsername(mailConfiguration.getUsername());
            if (mailConfiguration.getPassword() != null) {
                existing.setPassword(mailConfiguration.getPassword());
            }
            existing.setJavaMailProperties(mailConfiguration.getJavaMailProperties());
        } else {
            tenant.setMailConfiguration(mailConfiguration);
        }
        updateTenant(tenant);
    }

    @Override
    @Transactional
    public void importMailConfiguration(Tenant tenant, MailConfiguration mailConfiguration) {
        currentSubject().checkPermission(new TenantPermission(tenant.getId(), TenantPermission.TenantAction.UPDATE));
        notificationAdapterTypeCheck(mailConfiguration);
        MailConfiguration existing = tenant.getMailConfiguration();
        if (existing != null) {
            existing.setFromMailAddress(mailConfiguration.getFromMailAddress());
            existing.setAdapterConfiguration(mailConfiguration.getAdapterConfiguration());
        } else {
            if (StringUtils.isNotEmpty(mailConfiguration.getFromMailAddress()) ||
                    mailConfiguration.getAdapterConfiguration() != null) {
                mailConfiguration.setHostname("DUMMY");
                mailConfiguration.setPort(0);
                tenant.setMailConfiguration(mailConfiguration);
            }
        }
    }

    private void notificationAdapterTypeCheck(MailConfiguration mailConfiguration) {
        if (mailConfiguration.getAdapterConfiguration() != null &&
                !mailConfiguration.getAdapterConfiguration().isNotificationConfiguration()) {
            throw new NotificationAdapterTypeException();
        }
    }

    private void languageValidation(Tenant tenant, Language language) {
        if (!tenant.getLanguages().contains(language)) {
            throw new LanguageNotEnabledException(language == null ? StringUtils.EMPTY : language.getName());
        }
    }

    @Override

    private void copyMissingTranslationsIfNeeded(Language oldLanguage, Language newLanguage){
        if (oldLanguage != null && newLanguage != null && !oldLanguage.equals(newLanguage)) {
            copyMissingTranslationsForSchema("model",oldLanguage,newLanguage);
            copyMissingTranslationsForSchema("configuration",oldLanguage,newLanguage);
            copyMissingTranslationsForSchema("taxonomy",oldLanguage,newLanguage);
            copyMissingTranslationsForSchema("presentation",oldLanguage,newLanguage);
            copyMissingTranslationsForSchema("security", oldLanguage, newLanguage);
        }
    }

    private void copyMissingTranslationsForSchema(String schema, Language oldLanguage, Language newLanguage){
        UUID currentUser = currentUser().isPresent() ? currentUser().get().getId() : null;
        // default translations
        entityManager.createNativeQuery(
                "insert into " + schema + ".default_translation_value" +
                        "(id,created,last_updated,created_by_id,last_updated_by_id,language_id ,translation_id,description,display_name)" +
                        "select (md5(random()\\:\\:text || clock_timestamp()\\:\\:text)\\:\\:uuid),current_timestamp,current_timestamp,?,?,? ,translation_id,description,display_name " +
                        " from " + schema + ".default_translation_value oldLang where language_id = ? and deleted is null" +
                        " and not exists " +
                        "(select 1 from " + schema + ".default_translation_value newLang " +
                        "where oldLang.translation_id = newLang.translation_id " +
                        "and newLang.language_id = ? and deleted is null)")
                .setParameter(1,currentUser)
                .setParameter(2,currentUser)
                .setParameter(3,newLanguage.getId())
                .setParameter(4,oldLanguage.getId())
                .setParameter(5,newLanguage.getId())
        .executeUpdate();

        // audit
        entityManager.createNativeQuery(
                "insert into " + schema + "_audit.default_translation_value_audit" +
                        "(id, revision, revision_type ,created,last_updated,created_by_id,last_updated_by_id,language_id ,translation_id,description,display_name)" +
                        "select id,1,1,created,last_updated,created_by_id,last_updated_by_id,language_id,translation_id,description,display_name " +
                        " from " + schema + ".default_translation_value newLang where language_id = ? and deleted is null" +
                        " and not exists " +
                        "(select 1 from " + schema + "_audit.default_translation_value_audit newAudit " +
                        "where newLang.id = newAudit.id)")
                .setParameter(1,newLanguage.getId())
                .executeUpdate();

        // custom translations
        entityManager.createNativeQuery(
                "insert into " + schema + ".custom_translation_value" +
                        "(id,created,last_updated,created_by_id,last_updated_by_id,language_id ,translation_id,value)" +
                        "select (md5(random()\\:\\:text || clock_timestamp()\\:\\:text)\\:\\:uuid),current_timestamp,current_timestamp,?,?,? ,translation_id,value " +
                        " from " + schema + ".custom_translation_value oldLang where language_id = ? and deleted is null" +
                        " and not exists " +
                        "(select 1 from " + schema + ".custom_translation_value newLang " +
                        "where oldLang.translation_id = newLang.translation_id " +
                        "and newLang.language_id = ? and deleted is null)")
                .setParameter(1,currentUser)
                .setParameter(2,currentUser)
                .setParameter(3,newLanguage.getId())
                .setParameter(4,oldLanguage.getId())
                .setParameter(5,newLanguage.getId())
        .executeUpdate();

        // audit
        entityManager.createNativeQuery(
                "insert into " + schema + "_audit.custom_translation_value_audit" +
                        "(id, revision, revision_type ,created,last_updated,created_by_id,last_updated_by_id,language_id ,translation_id,value)" +
                        "select id,1,1,created,last_updated,created_by_id,last_updated_by_id,language_id,translation_id,value " +
                        " from " + schema + ".custom_translation_value newLang where language_id = ? and deleted is null" +
                        " and not exists " +
                        "(select 1 from " + schema + "_audit.custom_translation_value_audit newAudit " +
                        "where newLang.id = newAudit.id)")
                .setParameter(1,newLanguage.getId())
                .executeUpdate();

    }
