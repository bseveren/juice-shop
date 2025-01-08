@Component({
  selector: 'waiting-room-card',
  styleUrls: ['./waiting-room-card.component.scss'],
  templateUrl: './waiting-room-card.component.html',
})
export class WaitingRoomCardComponent implements AfterViewInit {
  scope = DashboardScope.TEAM;

  @ViewChildren('meetingRoomsMenu') meetingRoomsMenu!: QueryList<MeetingRoomsMenuComponent>;
  private meetingRoomsMenuSubscriptions: Subscription[] = [];

  constructor(
    @Inject('waitingRoomSessionsService') private waitingRoomSessionsService,

    public urlService: UrlService,
    public waitingRoomService: WaitingRoomService,
    private formatStringArrayPipe: FormatStringArrayPipe,
  ) {
    bind(this);
  }


  ngAfterViewInit() {
    this.meetingRoomsMenu.changes.subscribe(this.onMeetingRoomsMenuChanged);
  }


  trackById(index, groupedSession) {
    return groupedSession.key;
  }

  get knockingSessions() {
    return this.waitingRoomSessionsService.knockingSessionsList;
  }

  getKnockerText(waitingRoomSessions) {
    const meeting = waitingRoomSessions[0].session.meeting;
    const userNames = waitingRoomSessions.map(wrsession => wrsession.session.user.fullName);
    const formattedUserNames = this.formatStringArrayPipe.transform(userNames);

    if(meeting.isPersonalWaitingRoom) {
      return $localize `${formattedUserNames} is waiting at <b>your personal waiting room</b>`;
    } else if(meeting.isTeamWaitingRoom) {
      return (
        $localize `:singular:${formattedUserNames} is waiting at <b>your team waiting room</b>`
      );
    } else {
      const meetingKey = `<b>${meeting.key}<b>`;
      return userNames.length > 1 ?
        $localize `:plural:${formattedUserNames} want to join ${meetingKey}` :
        $localize `:singular:${formattedUserNames} wants to join ${meetingKey}`;
    }
  }


  get groupedSessions() {
    const sessionList = this.waitingRoomSessionsService.knockingSessionsList;

    return sessionList.reduce(function(res, wrSession) {
      const meeting = wrSession.session.meeting;
      let groupId = meeting.id;
      if(meeting.isPersonalWaitingRoom || meeting.isTeamWaitingRoom) {
        groupId = wrSession.session.id;
      }
      res[groupId] = res[meeting.id] || [];
      res[groupId].push(wrSession);
      return res;
    }, {});
  }


  /************
  * ACTIONS  *
  ***********/

  getKey(waitingRoomSessions) {
    return waitingRoomSessions[0].suggestedMeeting.key;
  }

  handleKnockerCardClick(waitingRoomSessions) {
    let redirectSelf = true;
    for(const session of waitingRoomSessions) {
      this.handleSession(session, redirectSelf);
      redirectSelf = false;
    }
  }

  private handleSession(waitingRoomSession, redirectSelf: boolean) {
    if(waitingRoomSession.isNewMeeting) {
      this.waitingRoomService.createPreferredAndRedirect(
        waitingRoomSession.suggestedMeeting.key,
        null,
        waitingRoomSession
      );
    } else {
      this.waitingRoomService.redirect(
        waitingRoomSession.suggestedMeeting,
        waitingRoomSession,
        redirectSelf
      );
    }
  }


  denyAccess(waitingRoomSessions) {
