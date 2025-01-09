module.exports = {

    /**
     * get all updated bookings from last 24 hours or historic import
     * @param environment: Are we on production or dev?
     * @param historic_import: if this is a historic import request
     * @param config: current config
     */
    get_bookings: async function( environment = 'development', rate, msg, config, node, reprocessed,run_id) { 
        const historic_import = msg.historic_import;
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        var bearerToken = "" + config.access_token;
        var currentPage = 0;
        var totalPages = 1;
        let numBookings = 0;
        if(!reprocessed)
            node.warn("Account ID(" + config.account_id + "):\n  Getting bookings data...");
        while(currentPage < totalPages){

            // Log os stuff... Memory etc
            osLogger.sendOsLog(node)

            currentPage++;
            var status = config.status ? config.status : "rejected,new,in_progress,complete,deleted,lost";
            var url = 'https://api-playpen.acme.com/api/bookings'; //development URL
            if(environment == 'production')
                url = 'https://api.acme.com/api/bookings'; //production URL
            if(!historic_import) //get updated entries from last 24 hours unless historic import, then get them all
                url += '?last_updated_from=' + date_func.formatDate(yesterday) + '&last_updated_to=' + date_func.formatDate(yesterday) +'';
            else
                url += '?last_updated_from=' + config.historic_import_date_from.replace(/\//g,'-') + '&last_updated_to=' + date_func.formatDate(new Date()) +'';
            url += "&limit=100&page=" + currentPage;
            url += `&status=${status}`;
            await sleep(rate);
            const bookings_request = await axios.get(url, {
                headers: { Authorization: `Bearer ${bearerToken}` }
            }).catch(function (error) {
                return axios_func.catchError(error);
            });

            if(bookings_request && bookings_request.status == 200 && bookings_request.data){ //successful reponse

                totalPages = parseInt(bookings_request.headers['x-pagination-total-pages'], 10);
                node.warn('total pages: ' + totalPages + ' currentPage: ' + currentPage)

                // Do exclusions if its in config
                if (config.exclusions !== undefined) {

                    // Filter out exclusions
                    const filteredBookings = this.filterExclusionsFromBookings(bookings_request.data.bookings, config, node);
                    numBookings += filteredBookings.length;
                    await this.get_contacts_detail(environment, rate, filteredBookings, historic_import, config, node, reprocessed, msg, run_id); 

                } else {
                    numBookings += bookings_request.data.bookings.length; 
                    await this.get_contacts_detail(environment, rate, bookings_request.data.bookings, historic_import, config, node, reprocessed, msg, run_id);
                }
            } else { //failed response
                send_error_message(`error getting bookings for account ${config.account_id}. ${axios_func.formatReponse(bookings_request)}`, node)
                return             
            } 
        }
        if(!reprocessed){
            node.warn("Account ID(" + config.account_id + "):\n  Got " + numBookings + " new entries");
        }
    
        return
    },
    get_contacts_detail: async function(environment = 'development', rate, bookings_array, historic_import, config, node, reprocessed, msg, run_id){
        node.warn("Account ID(" + config.account_id + "):\n  Getting contact details for " +  bookings_array.length + " entries, this may take a few mins depending on number of entries...");
        
        var bearerToken = "" + config.access_token;
        
        //for each booking entry, get additional contact details from DMN api call
        while (bookings_array.length > 0) {
            const booking = bookings_array.shift(); // Removes the first booking from the array and processes it
    
            osLogger.sendOsLog(node);

            if(booking.customer_id){
                var url = 'https://api-playpen.acme.com/api/customers/'; //development URL
                if(environment == 'production')
                    url = 'https://api.acme.com/api/customers/'; //production URL   
                url += booking.customer_id;
                const contact_request = await axios.get(url, {
                    headers: { Authorization: `Bearer ${bearerToken}` }
                }).catch(function (error) {
                    node.warn(axios_func.catchError(error));
                });

                if (contact_request === undefined){
                    continue;
                }

                await sleep(rate);

                if (contact_request.headers !== undefined){
                    console.log('Remaining rate: ' + contact_request.headers['x-ratelimit-remaining']);
                }
                if (contact_request.status !== undefined){
                    console.log('Status: ' + contact_request.status + "\n\n");
                }

                if(contact_request.status == 200 && contact_request.data.customer){ //successful reponse
                    booking.customer = contact_request.data.customer;

                    const mappedBooking = bookings.map_bookings(booking, historic_import, config); //map DMN booking data to *** format
                    send_node_messages(mappedBooking, node, msg, config, run_id, reprocessed)

                } else { //failed response
                    send_error_message(`error getting customer for booking id ${booking.id} on account ${config.account_id}. ${axios_func.formatReponse(bookings_request)}`, node);
                    return 
                }
            }
        }
        return
    },
