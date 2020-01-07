module.exports = {

    // echart 에서 사용하기 위해 시간대별로 데이터를 가공
    mConvertOptionSerial: function(dataList) {
        // Fill Time Flow
        const timeFlow = [];
        for (let i=0;i<24;i++) {
            timeFlow[i] = 0;
        }

        // Set Option Serial
        dataList.forEach(function(elem) {
            const hour = new Date(elem.time).getHours();
            timeFlow[hour] += 1;
        });

        return timeFlow;
    },
    // echart 에서 사용하기 위해 시간대별로 데이터를 가공

    comparisionByDisplayStand: async function(sensorList, rawDataList) {

        console.log(sensorList);
        console.log(rawDataList);

        // Fill Convert Data List
        const convertDataList = [];
        for (let i=0; i<sensorList.length; i++) {
            for (let j=0; j<24; j++) {
                convertDataList.push([j, i, 0]);
            }
        }

        // Set Data
        // rawDataList.forEach(function(elem, index) {
        //     const userDetectionList = elem.userDetectionList.split(',');
        //     const timeArr = elem.times.split(',');
        //
        //     let standardIndex = 0;
        //     sensorList.some(function(sensor, index) {
        //         if (Number(sensor.sensorsId) === Number(elem.sensors_id)) {
        //             standardIndex = index;
        //             return true;
        //         }
        //     });
        //
        //     for (let idx=0; idx<userDetectionList.length; idx++) {
        //         const hour = new Date(timeArr[idx]).getHours();
        //         const findIndex = (standardIndex * 24) + hour;
        //         convertDataList[findIndex][2] += 1;
        //     }
        // });

        rawDataList.forEach(function(elem) {

            sensorList.some(function(sensor, index) {

            });
        });

        return convertDataList;
    },

    hourlyAnalysis: async function(rawDataList) {
        // Fill Convert Data List
        const convertDataList = [];
        for (let i=0; i<24; i++) {
            convertDataList.push([]);
        }

        // Set Data
        rawDataList.forEach(function(elem, index) {
            const durationArr = elem.durations.split(',');
            const timeArr = elem.times.split(',');

            for (let idx=0; idx<timeArr.length; idx++) {
                const hour = new Date(timeArr[idx]).getHours();
                convertDataList[hour].push(durationArr[idx]);
            }
        });

        return convertDataList;
    },

};