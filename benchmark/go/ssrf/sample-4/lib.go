package lib

import (
	"io/ioutil"
	"net/http"
)

// SendEmail sends an email based on type and language
func SendEmail(email string, tp string, lang string, params []string, version string, fileNames []string, conf nest.EmailConf) (err error) {
	if !conf.SendEmail {
		return nil
	}
	var htmlCode []byte
	if val, ok := htmlTemplates[tp]; ok {
		// Read email template
		response, err := http.Get(conf.EmailTmpl + "/" + val)
		if err != nil {
			return err
		}
		htmlCode, err = ioutil.ReadAll(response.Body)
		if err != nil {
			return err
		}
	}
