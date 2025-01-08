import { useState } from "react";
import { getIcon } from "***-templateconfigurator/util/icons";

export const Tooltip = ({ children }) => {
    const [visible, setVisible] = useState(false);

    return (
        <div className='hover:tw-bg-[#ffffff] tw-w-full tw-items-center tw-h-full tw-flex tw-justify-center tw-static' onMouseEnter={(e) => setVisible(true)} onMouseLeave={(e) => setVisible(false)}>
            <div className='hover:tw-bg-[#ffffff] tw-w-full tw-items-center tw-h-full tw-flex tw-justify-center'>
                {getIcon('info')}
            </div>
            {visible &&
                <div id="tooltip-default" role="tooltip" className="tooltip tw-text-xs tw-bottom-full tw-right-0 tw-min-w-[240px] tw-inline-block tw-absolute tw-z-10 tw-py-2 tw-px-2 tw-text-[12px] tw-font-medium tw-text-white tw-rounded-lg tw-shadow-sm tw-duration-300 tw-text-left tw-tooltip bg-gray-700">
                    <div dangerouslySetInnerHTML={{ __html: children }}></div>
