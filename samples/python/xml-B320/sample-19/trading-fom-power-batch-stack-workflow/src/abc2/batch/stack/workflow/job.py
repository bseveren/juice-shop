import logging

from abc2.common.core.workflow import Download

logger = logging.getLogger(__name__)
logging.getLogger('pymongo').setLevel(logging.WARNING)

if __name__ == '__main__':
    import argparse
    from abc2.utils.toolbox import setup_logging
    setup_logging()
    parser = argparse.ArgumentParser(description='Stack Model Download')
    parser.add_argument('--default', dest='default', action='store_true')
    parser.add_argument('--output_type', dest='output_type',
                        nargs='+', choices=['curve', 'base_case', 'weather_sensitivity', 'backrun', 'adhoc'])
    parser.add_argument('--run_prep', dest='run_prep', action='store_true', default=False)
    parser.set_defaults(default=True)
    args, _ = parser.parse_known_args()
    process = Download()

    if args.default and args.output_type is None:
        process.run(run_prep=args.run_prep)
    else:
        for output_type in args.output_type:
            logger.info(f'Start: {output_type}')
            process.run(output_type=[output_type])
            logger.info(f'Completed: {output_type}')
