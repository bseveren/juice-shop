import EventSource, {
  EventSources,
  PageReadResults,
  SourceData,
} from '../EventSource';
import { getEvents } from './extract';
import { transform } from './transform';
import { IngestScrapedEventRequest } from '../EventSource/types';
import type { Event } from './types';
import { generateOrganizerNameFromExternalUrl } from '../RunSignup/utils';
import { load } from 'cheerio';

// race roster's api requires a query string
// to maximise the events we scrape, we use a range of query strings and accept there'll be overlap
const queryStrings = [
  'run',
  'race',
  'tri',
  'marathon',
  'cycl',
  'swim',
  'series',
  'walk',
];

class RaceRoster extends EventSource {
  source = EventSources.RACE_ROSTER;

  readListing = async (payload = '0'): Promise<PageReadResults> => {
    const [pageNumber, queryStr = queryStrings[0]] = payload.split('/');

    if (!pageNumber || !queryStr) {
      throw new Error(
        `Read listing requires a page number and query string, received: ${payload}`,
      );
    }

    const { nextPage, events } = await getEvents(pageNumber, queryStr);

    let uriForNextPage;
    const nextQueryStr = queryStrings[queryStrings.indexOf(queryStr) + 1];
    if (nextPage) {
      uriForNextPage = `${nextPage}/${queryStr}`;
    } else if (nextQueryStr) {
      uriForNextPage = `0/${nextQueryStr}`;
    }

    return {
      uriForNextPage,
      toProcess: events.map((event) => {
        return {
          eventSource: this.source,
          uriOrId: event.uri,
          listingContext: event.data,
        };
      }),
    };
  };

  download = async (
    uriOrId: string,
    listingContext: Record<string, any>,
  ): Promise<SourceData> => {
    // retrieve event
    const event: Event = listingContext as unknown as Event;

    if (!event) {
      throw new Error(`Event could not be retrieved for id: ${uriOrId}`);
    }

    // event url is always the race roster link, try to extract external url from event page
    let eventUrl = event.url.toLowerCase();

    const rsuRes = await fetch(eventUrl);
    if (rsuRes.url === eventUrl) {
      const rsu$ = load(await rsuRes.text());
      const externalUrl = rsu$('a:contains("Visit Website")').attr('href');
      if (externalUrl) {
        eventUrl = externalUrl;
      }
    }

    // extract organizer name
    let organizerName;

    if (eventUrl && !eventUrl.includes('raceroster')) {
      organizerName = await generateOrganizerNameFromExternalUrl(eventUrl);
    }

    return {
      sourceId: uriOrId,
      meta: {},
      uri: uriOrId,
      dataType: 'json',
      data: {
        ...event,
        organizerName,
        url: eventUrl,
        originUrl: event.url,
      },
    };
  };

  transform = async (
    _eventDataSourceId: string,
    { data }: SourceData,
  ): Promise<IngestScrapedEventRequest | null> => {
    const res = await transform(data);

    return res;
  };
}
