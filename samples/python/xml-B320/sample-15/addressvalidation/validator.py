from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, String, MetaData
from sqlalchemy.orm import sessionmaker
import progressbar

import bb_sql
from addressvalidation.usps_verify import verify
from addressvalidation.config import ADDRESS_TABLE, USPS_TOKEN

def validate_addresses(session, engine):
    RewardsAddress.metadata.bind = engine

    # Retrieve any records tha haven't already be verified by the process
    q = session.query(RewardsAddress).filter(RewardsAddress.usps_verified == None).order_by(
        RewardsAddress.Person_DOS_Key)
    record_count = q.count()

    # progress bar widgets and initialization
    widgets = [
        'Verifying: ', progressbar.Percentage(),
        ' ', progressbar.Bar(marker='#', left='[', right=']'),
        ' ', progressbar.ETA(),
    ]
    bar = progressbar.ProgressBar(widgets=widgets, max_value=record_count).start()

    # process row by row the results of the above query
    for row in q:
        d_row = {
            'address': ' '.join([row.Employee_Address_1, row.Employee_Address_2]).strip(),
            'city': row.Employee_City.strip(),
            'state': row.Employee_State.strip(),
            'zip5': row.Employee_Zip.strip()
        }

        try:
            # this is the money line, actually calling the API
            resp = verify(USPS_TOKEN, d_row)

            row.usps_verified = True
            row.usps_address = resp['address']
            row.usps_city = resp['city']
            row.usps_state = resp['state']
            row.usps_zip5 = resp['zip5']
        except ValueError as e:
            # if USPS can't find it, this happens and you save an error message
            row.usps_verified = e.args[0].split(':')[-1].strip()

        # save the sql update
        session.commit()
        bar.update(bar.value + 1)

    bar.finish()
