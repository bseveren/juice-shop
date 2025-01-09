class Helper {
  /* eslint-disable */
  async downloadDocument(targetDocument) {
    const documentURL = `${window.rootVue.$env.value(
      'VUE_APP_API_BASE_URL',
      'http://localhost:8080'
    )}${window.rootVue.$env.value('VUE_APP_DOCUMENT_BASE_URL', '/documents/download')}/${targetDocument.id}`;
    let documentName = targetDocument.name;

    if (targetDocument.file.length > 0 && !documentName.endsWith(targetDocument.file[0].ext)) {
      documentName += targetDocument.file[0].ext;
    }

    return this.downloadURL(documentURL, documentName);
  }

  async downloadURL(targetUrl = '', name = 'download') {
    if (!targetUrl || targetUrl.length === 0) {
      return false;
    }

    if (targetUrl.startsWith('/')) {
      targetUrl = `${window.rootVue.$env.value('VUE_APP_API_BASE_URL', 'http://localhost:8080')}${targetUrl}`;
    }

    const token = window.rootVue.$store.state.accessToken;
    const managedHomeID = window.rootVue.$store.state.currentManagedHome
      ? window.rootVue.$store.state.currentManagedHome.id
      : '';
    const headers = {};

    if (token && token.length > 0) {
      headers.authorization = `Bearer ${token}`;
    }

    if (managedHomeID && managedHomeID.length > 0) {
      headers['X-Active-Home'] = managedHomeID;
      const params = new URLSearchParams({ home: managedHomeID });
      targetUrl = `${targetUrl}?${params.toString()}`;
    }

    try {
      const response = await axios({
        url: targetUrl,
        method: 'GET',
        responseType: 'blob',
        headers
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();
      return true;
    } catch (error) {
      let statusCode = 0;
      if (error && error.response && error.response.status > 0) {
        statusCode = error.response.status;
      }
      window.rootVue.$modal.show('ErrorModal', {
        title: `${window.rootVue.$t('Library.Error.DownloadFailed.Title')} ${statusCode > 0 ? `(${statusCode})` : ''}`,
        error: window.rootVue.$t('Library.Error.DownloadFailed.Body')
      });
    }

    return false;
  }
