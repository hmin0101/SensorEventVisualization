var express = require('express');
var router = express.Router();
/* DB */
const query = require('../model/query');
/* Convert Data Functions */
const convert  = require('../public/javascripts/custom-convert');

let deviceList = [];                                                                        // Device List
let CUR_POS = 0;                                                                            // Device List 내에서 현재 선택한 단말의 Index 를 저장하기 위한 변수

/* 데이터베이스로부터 디바이스 목록과 각 디바이스에 연결된 센서들의 정보를 가져옴 */
(async function getDeviceList() {
    const result = await query.getDeviceList();
    if (result.result) {
        deviceList = result.message.map(function(elem) {
            return {
                id: elem.device_id,
                name: elem.name,
                sensors: []
            }
        });

        // 각 디바이스별 센서 목록
        const selectResult = await query.getSensorList();
        if (selectResult.result) {
            for (const sensor of selectResult.message) {
                let idx = 0;
                for (const device of deviceList) {
                    if (device.id === sensor.device_id) {
                        deviceList[idx].sensors.push({
                            id: sensor.sensors_id,
                            name: sensor.name
                        });
                        break;
                    }
                    idx++;
                }
            }
        }
    }
})();

/* Main 접속 시, /sensor/1 으로 redirect */
router.get('/', function(req, res, next) {
  res.redirect('/sensor/1');
});

/*
 * 디바이스 선택에 따라서 디바이스에 연결된 센서들의 이벤트 데이터를 데이터베이스로부터 읽어와 그래프에 사용하기 위한 데이터로 변환
 */
router.post('/choice/device', async function(req, res) {
    const type = req.body.type;
    const deviceId = req.body.id;

    let index = 0;
    for (const device of deviceList) {
        if (Number(deviceId) === Number(device.id))
            CUR_POS = index;
        index++;
    }

    switch (type) {
        case "detect":
            const udData = await getAccessEventDataByDevice(deviceList[CUR_POS].id);
            const opData = await getPickupEventDataByDevice(deviceList[CUR_POS].id);
            await res.json({result: true, udData: udData, opData: opData});
            break;
        case "access":
            const accessEventData = await getAccessEventDataByDevice(deviceList[CUR_POS].id);
            await res.json({result: true, accessEventData: accessEventData});
            break;
        case "pickup":
            const pickupEventData = await getPickupEventDataByDevice(deviceList[CUR_POS].id);
            await res.json({result: true, pickupEventData: pickupEventData});
            break;
        case "stay":
            const sensorId = req.body.sensorId;
            const stayEventData = await getStayEventDataBySensor(sensorId);
            await res.json({result: true, stayEventData: stayEventData});
            break;
        case "setting":
            const list = await getPopupList(deviceList[CUR_POS].id);
            await res.json({result: true, list: list});
            break;
        default:
            await res.json({result: false, message: "Type Error"});
            break;
    }
});

/* ACCESS_EVENT */
router.get('/event/access', async function(req, res) {
    const accessEventData = await getAccessEventDataByDevice(deviceList[CUR_POS].id);
    res.render('event_access', {currentMenu: "access", deviceList: deviceList, pos: CUR_POS, accessEventData: JSON.stringify(accessEventData)});
});

/* PICKUP_EVENT */
router.get('/event/pickup', async function(req, res) {
    const pickupEventData = await getPickupEventDataByDevice(deviceList[CUR_POS].id);
    res.render('event_pickup', {currentMenu: "pickup", deviceList: deviceList, pos: CUR_POS, pickupEventData: JSON.stringify(pickupEventData)});
});

/* STAY_EVENT */
router.get('/event/stay', async function(req, res) {
    const stayEventData = await getStayEventDataBySensor(9);
    res.render('event_stay', {currentMenu: "stay", deviceList: deviceList, pos: CUR_POS, stayEventData: JSON.stringify(stayEventData)});
});

/* ACCESS_EVENT */
router.post('/sensor/list', function(req, res) {
    const deviceId = req.body.deviceId;

    let sensorList = [];
    for (const device of deviceList) {
        if (Number(device.id) === Number(deviceId)) {
            sensorList = device.sensors;
        }
    }
    res.json({result: true, sensorList: sensorList});
});

/* 디바이스의 각 센서별 이벤트 데이터 시각화 */
router.get('/sensor/:id', async function(req, res) {
    const sensorIndex = Number(req.params.id);
    const udOption = await getUserDetectionInDisplayStand(deviceList[CUR_POS].sensors[sensorIndex-1].id);         // Sensor 에 대한 사용자 감지 이벤트를 가져오고 Chart 에서 사용할 수 있도록 처리
    const opOption = await getObjectPickupInDisplayStand(deviceList[CUR_POS].sensors[sensorIndex-1].id);          // Sensor 에 대한 물건 픽업 이벤트를 가져오고 Chart 에서 사용할 수 있도록 처리
    res.render('event-by-sensor', {currentMenu: "detail", sensorIndex: sensorIndex, deviceList: deviceList, pos: CUR_POS, userDetectionSerial: JSON.stringify(udOption), objectPickupSerial: JSON.stringify(opOption)});    // Sensor 에 각 이벤트 데이터를 파라미터로 넘겨줌 ( m1.ejs 를 표출 )
});

/* SETTING */
router.get('/setting', async function(req, res) {
    res.render('setting', {currentMenu: "setting", deviceList: deviceList, pos: CUR_POS});    // Sensor 에 각 이벤트 데이터를 파라미터로 넘겨줌 ( m1.ejs 를 표출 )
});

/* SELECT SETTING */
router.get('/setting/popup/list', async function(req, res) {
    const result = await getPopupList(deviceList[CUR_POS].id);
    await res.json(result);
});

/* ADD SETTING */
router.post('/setting/popup/add', async function(req, res) {
    const option = JSON.parse(req.body.option);
    const result = await query.addPopupSetting(deviceList[CUR_POS].id, option);
    await res.json(result);
});

/* UPDATE SETTING */
router.post('/setting/popup/update', async function(req, res) {
    const option = JSON.parse(req.body.option);
    const result = await query.updatePopupSetting(deviceList[CUR_POS].id, option);
    await res.json(result);
});

/* DELETE SETTING */
router.post('/setting/popup/delete', async function(req, res) {
        // Sensor 에 각 이벤트 데이터를 파라미터로 넘겨줌 ( m1.ejs 를 표출 )
});

/* 시간대별 이벤트 팝업 표출 횟수를 시각화하여 보여주는 Page */
router.get('/advertise', async function(req, res) {
    const adOption = await getAdvertisementCount(deviceList[CUR_POS].id);                                     // DB에서 시간대별 이벤트 표출 횟수를 가져와 echart에서 사용할 수 있도록 가공
    res.render('advertise', {currentMenu: "advertise", deviceList: deviceList, pos: CUR_POS, advertisementSerial: JSON.stringify(adOption)});           // echart 에서 사용할 가공한 데이터를 파라미터로 넘겨줌 ( advertise.ejs 를 표출)
});

/* 센서별 ACCESS EVENT 데이터 */
async function getAccessEventDataBySensor(SensorId) {
    const selectAccessEventResult = await query.getUserDetectionBySensor(SensorId);
    if (selectAccessEventResult.result) {
        const sensorListInDevice = selectAccessEventResult.message.map(function(elem) {
            return {
                sensorId: elem.sensors_id,
                name: elem.name,
                times: elem.times
            }
        });

        const resultDataList = [];
        for (const sensorData of sensorListInDevice) {
            if (sensorData.times === null) {
                const result = await convert.convertArrayToTimeData([]);

                resultDataList.push({
                    name: sensorData.name,
                    data: result
                });
            } else {
                const timeList = sensorData.times.split(",");
                const result = await convert.convertArrayToTimeData(timeList);

                resultDataList.push({
                    name: sensorData.name,
                    data: result
                });
            }
        }

        return await convert.convertDataToChartData(resultDataList, "line");
    } else {
        return [];
    }
}

/* 단말별 ACCESS EVENT 데이터 */
async function getAccessEventDataByDevice(deviceId) {
    const selectAccessEventResult = await query.getUserDetectionByDevice(deviceId);
    if (selectAccessEventResult.result) {
        const sensorListInDevice = selectAccessEventResult.message.map(function(elem) {
            return {
                sensorId: elem.sensors_id,
                name: elem.name,
                times: elem.times
            }
        });

        const resultDataList = [];
        for (const sensorData of sensorListInDevice) {
            if (sensorData.times === null) {
                const result = await convert.convertArrayToTimeData([]);

                resultDataList.push({
                    name: sensorData.name,
                    data: result
                });
            } else {
                const timeList = sensorData.times.split(",");
                const result = await convert.convertArrayToTimeData(timeList);

                resultDataList.push({
                    name: sensorData.name,
                    data: result
                });
            }
        }

        return await convert.convertDataToChartData(resultDataList, "line");
    } else {
        return [];
    }
}

/* 단말별 PICKUP EVENT 데이터 */
async function getPickupEventDataByDevice(deviceId) {
    const selectPickupEventResult = await query.getObjectPickupByDevice(deviceId);
    if (selectPickupEventResult.result) {
        const sensorListInDevice = selectPickupEventResult.message.map(function(elem) {
            return {
                sensorId: elem.sensors_id,
                name: elem.name,
                times: elem.times
            }
        });

        const resultDataList = [];
        for (const sensorData of sensorListInDevice) {
            if (sensorData.times === null) {
                const result = await convert.convertArrayToTimeData([]);
                resultDataList.push({
                    name: sensorData.name,
                    data: result
                });
            } else {
                const timeList = sensorData.times.split(",");
                const result = await convert.convertArrayToTimeData(timeList);

                resultDataList.push({
                    name: sensorData.name,
                    data: result
                });
            }
        }

        return await convert.convertDataToChartData(resultDataList, "line");
    } else {
        return [];
    }
}

/* 데이터베이스에서 요청 받은 디바이스에 대한 사용자 감지시간(Duration) 데이터를 가져와 그래프에서 사용할 수 있도록 가공하여 반환하는 함수 */
async function getStayEventDataBySensor(sensorId) {
    const selectStayEventResult = await query.getStayEventBySensor(sensorId);           // 사용자가 센서 앞에서 얼마나 머물렀는지를 알 수 있는 Duration 값을 DB 에서 가져옴
    if (selectStayEventResult.result) {
        const convertedData = await convert.convertStayTimeArrayToTimeData(selectStayEventResult.message[0]);             // Duration Data 를 시각화하기 위해 이벤트 발생 시간을 기준으로 데이터 가공
        const resultDataList = [{
            name: selectStayEventResult.message[0].name,
            data: convertedData
        }];

        const chartDataList = await convert.convertDataToChartData(resultDataList, "boxplot");
        return chartDataList[0];
    } else {
        return [];
    }
}

/* 데이터베이스에서 요청 받은 SensorID에 대한 사용자 감지 이벤트 데이터를 가져와 그래프에서 사용할 수 있도록 변환하여 반환하는 함수 */
async function getUserDetectionInDisplayStand(sensorsId) {
    let userDetectionEvent;
    const userDetectionResult = await query.getUserDetectionBySensor(sensorsId);            // DB 에 저장된 Sensor ID를 가진 센서의 사용자 감지 이벤트 데이터를 가져옴
    if (userDetectionResult.result) {
        const list = userDetectionResult.message.map(function (elem) {              // 데이터 가공
            return {
                userDetectionId: elem.user_detection_id,
                time: elem.time,
            }
        });

        if (list.length > 0) userDetectionEvent = list;
        else userDetectionEvent = [];
    } else {
        userDetectionEvent = [];
    }
    return await convert.mConvertOptionSerial(userDetectionEvent);          // echart로 그래프를 그리기 위해서 List를 시간대별로 묶어서 가공
}

/* 데이터베이스에서 요청 받은 SensorID에 대한 물건 픽업 이벤트 데이터를 가져와 그래프에서 사용할 수 있도록 변환하여 반환하는 함수 */
async function getObjectPickupInDisplayStand(sensorsId) {
    let objectPickupEvent;

    if (sensorsId < 0) {
        return [];
    } else {
        const objectPickupResult = await query.getObjectPickupBySensor(sensorsId);          // DB 에 저장된 Sensor ID를 가진 센서의 물건 픽업 이벤트 데이터를 가져옴
        if (objectPickupResult.result) {
            const list = objectPickupResult.message.map(function (elem) {           // 데이터 가공
                return {
                    objectPickupId: elem.object_pickup_id,
                    time: elem.time,
                }
            });

            if (list.length > 0) objectPickupEvent = list;
            else objectPickupEvent = [];
        } else {
            objectPickupEvent = [];
        }
        return await convert.mConvertOptionSerial(objectPickupEvent);          // echart로 그래프를 그리기 위해서 List를 시간대별로 묶어서 가공
    }
}

/* 데이터베이스에서 요청 받은 디바이스에 대한 Popup 표출 횟수 데이터를 가져와 그래프에서 사용할 수 있도록 가공하여 반환하는 함수  */
async function getAdvertisementCount(deviceId) {
    let advertisementCount;

    const advertisementResult = await query.getAdvertisementData(deviceId);         // DB 에서 팝업 표출 횟수를 가져옴
    if (advertisementResult.result) {
        const list = advertisementResult.message.map(function (elem) {      // 데이터를 가공하여 List 를 생성
            return {
                advertisementId: elem.advertisement_id,
                time: elem.time,
            }
        });

        if (list.length > 0) advertisementCount = list;
        else advertisementCount = [];
    } else {
        advertisementCount = [];
    }
    return await convert.mConvertOptionSerial(advertisementCount);              // echart로 그래프를 그리기 위해서 List를 시간대별로 묶어서 가공
}

/* Get Popup Setting List */
async function getPopupList(deviceId) {
    const result = await query.getPopupSetting(deviceId);
    if (result.result) {
        return await result.message.map(function(elem) {
            return {
                id: elem.advertisement_setting_id,
                name: elem.key,
                url: elem.url,
                pos_x: elem.x_axis,
                pos_y: elem.y_axis,
                width: elem.width,
                height: elem.height,
                duration: elem.duration,
                type: elem.type,
            }
        });
    } else {
        return [];
    }
}

module.exports = router;
