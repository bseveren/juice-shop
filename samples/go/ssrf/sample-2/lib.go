package lib

import (
	"fmt"
	"log"
	"net/http"
)

// fetching the watcher from the database, having status as the argument, "created", "expiry", "expected_value_matched", "in-queue","watching"
func FetchWatchersFromDB(status string) ([]WatcherInfo, error) {
	log.Printf("Fetching watchers with status '%s' from database", status)
	baseURL := config.GetConfig().APIDatabaseURL
	endpoint := fmt.Sprintf("%s/watchers_rewatch?status=%s", baseURL, status)
	log.Printf("Making HTTP GET request to fetch watchers: %s", endpoint)
	resp, err := http.Get(endpoint)
	if err != nil {
		log.Printf("Failed to fetch watchers from the database. Error: %v", err)
		return nil, err
	}
	defer resp.Body.Close()
