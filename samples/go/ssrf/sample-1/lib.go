package lib

import (
	"fmt"
	"net/http"
	"net/url"
	"regexp"
)

// CallSmsDirect sends SMS per request
func CallSmsDirect(data *DirectSmsRequest, w http.ResponseWriter, r *http.Request) {
	coding := 0
	// Check encoding of text
	match, _ := regexp.MatchString("[\u0400-\u04FF]", data.Msg)
	if match {
		coding = 1
	}
	providerURL := "https://sapi.acme.gr/http/sms.php?auth_key=%s&id=%s&from=%s&to=%s&text=%s&coding=%d&validity=90"
	url := fmt.Sprintf(providerURL, config.Conf.Mstat.Auth, data.ID, url.QueryEscape(data.From), data.To, url.QueryEscape(data.Msg), coding)
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		helpers.LogFile("senders.callSmsDirect --> Problem with request! | "+err.Error(), "errors.log")
		helpers.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

}
