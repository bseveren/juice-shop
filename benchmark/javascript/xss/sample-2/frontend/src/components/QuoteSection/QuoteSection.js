import React from 'react';
import style from './QuoteSection.module.scss';

export default ({ content }) => {
  return (
    <section className="white-container container-fluid">
      <div className="row">
        <div className="col-lg-8 offset-lg-1">
          <div className={style.wrapper}>
            <span className={style.block} />
            <span
              className={style.quote}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
