module.exports = {

    convertDataToChartData: function(data, type) {
        return data.map(function(elem) {
            return {
                name: elem.name,
                type: type,
                data: elem.data
            }
        });
    },

    // 시간 배열 데이터를 echart 에서 사용하기 위해 시간대별로 데이터를 가공
    convertArrayToTimeData: async function(timeList) {
        // Fill Time Flow
        const timeFlow = [];
        for (let i=0;i<24;i++) {
            timeFlow[i] = 0;
        }

        // Set Option Serial
        for (const time of timeList) {
            const hour = new Date(time).getHours();
            timeFlow[hour] += 1;
        }

        return timeFlow;
    },

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

    convertStayTimeArrayToTimeData: async function(sensorData) {
        // Fill Convert Data List
        const timeFlow = [];
        for (let i=0; i<24; i++) {
            timeFlow.push([]);
        }

        let timeList = [], stayTimeList = [];
        if (sensorData.times !== null) {
            timeList = sensorData.times.split(',');
        }
        if (sensorData.stayTime !== null) {
            stayTimeList =sensorData.stayTime.split(',');
        }

        const dataSize = timeList.length;
        for (let i=0; i<dataSize; i++) {
            const hour = new Date(timeList[i]).getHours();
            if (Number(stayTimeList[i]) !== 0) {
                timeFlow[hour].push(stayTimeList[i]);
            }
        }
        return timeFlow;
    },

};