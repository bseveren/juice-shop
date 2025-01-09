                            <SearchFilter placeholderText={t("Search")}
                                          inputStyles={{width: '400px', maxWidth: '100%'}}/>
                        </FilterContextProvider>
                    </>
                }
                filtersBottom={<>
                    <FilterContextProvider name="statusCode">
                        <SelectFilter options={[
                            {
                                value: '500',
                                label: t('Error')
                            },
                            {
                                value: '404',
                                label: t('Not Found')
                            },
                            {
                                value: '200',
                                label: t('Success')
                            }
                        ]} placeholder={<div>{t("Status code")}</div>}/>
                    </FilterContextProvider>
                    <FilterContextProvider name="action">
                        <SelectFilter options={[
                            {
                                value: 'request',
                                label: t('Request')
                            },
                            {
                                value: 'updated',
                                label: t('Updated')
                            },
                            {
                                value: 'created',
                                label: t('Created')
                            },
                            {
                                value: 'deleted',
                                label: t('Deleted')
                            }
                        ]} placeholder={<div>{t("Action")}</div>}/>
                    </FilterContextProvider>
                    <FilterContextProvider name="date">
                        <DateRangeFilter/>
                    </FilterContextProvider>
                    <FilterContextProvider>
                        <ResetFilters/>
                    </FilterContextProvider>
                </>}
                buttons={<></>}
                columns={[
                    {header: t("Email"), accessor: "email"},
                    {header: t("Action"), accessor: "method"},
                    {header: t("URL"), accessor: "originalUrl"},
                    {header: t("Request Body"), accessor: "requestBody"},
                    {header: t("Timestamp"), accessor: "@timestamp"},
                    {header: t("Actions"), accessor: "actions"},
                ]}
                rows={data.data || []}
                pageCount={pageCount}
                loadingData={loadingData}
                error={errorMessage}
                emptyDataMessage={t("No logs found")}
                actions={(item) => (
                    <div className="d-flex align-items-center">
                        <Link to="#" className="mr-1" onClick={e => { e.preventDefault(); setSelectedItem(item); setShowViewItem(true); }}>
                            <CustomTooltip icon={<EyeOpen/>} message={t('View')}/>
                        </Link>
                    </div>
                )}
                customOutputs={(columnName, value, row) => {
                    switch (columnName){
                        case 'method' :
                            switch (value) {
                                case 'GET':
                                    return <span style={{color: '#14aa40', fontWeight: 700 }}>{t("Request")}</span>
                                case 'POST':
                                    return <span style={{color: '#3982E8', fontWeight: 700 }}>{t("Created")}</span>
                                case 'PATCH':
                                case 'PUT':
                                    return <span style={{color: '#FFB50D', fontWeight: 700 }}>{t("Updated")}</span>
                                case 'DELETE':
                                    return <span style={{color: '#F66565', fontWeight: 700 }}>{t("Deleted")}</span>
                                default:
                                    return value;
                            }
                        case '@timestamp' :
                            return formatDate(value, 'yyyy-MM-dd HH:mm:ss')
                        case 'email':
                        case 'requestBody':
                        case 'originalUrl':
                            let searchString = queryParams?.s;
                            let searchInFields = queryParams?.search_in_fields;
                            if (
                                (columnName === 'email' && searchString && (searchInFields === 'email' || searchInFields === ''))
                                || ((columnName === 'requestBody' || columnName === 'originalUrl') && searchString && searchInFields === 'in_request')
                            ) {
                                let searchRegex = new RegExp(`(${searchString})`, 'gi');
                                value = value.replace(searchRegex, '<strong>$1</strong>');
                            }
                            return (
                                <span dangerouslySetInnerHTML={{ __html: value }} />
                            );

                        default:
                            return value
                    }
                }}
            />

        </Layout>
    );
}

export default Index;
