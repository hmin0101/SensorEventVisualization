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

router.get('/error', function(req, res) {
    res.render('error', {message: "데이터베이스에 저장되어 있는 데이터가 없습니다.", error: {status: "Error Code : 500", stack: "Not Found Data In Database"}});
});

/* 단말을 변경하게 되면 해당 단말에 연결된 센서들의 이벤트 데이터를 데이터베이트로부터 읽어와 현재 보여줄 데이터의 유형에 맞춰 그래프에 사용하기 위한 데이터로 변환 */
router.post('/choice/device', async function(req, res) {
    const type = req.body.type;
    const deviceId = req.body.id;

    if (deviceList.length > 0) {
        let index = 0;
        for (const device of deviceList) {
            if (Number(deviceId) === Number(device.id))
                CUR_POS = index;
            index++;
        }

        switch (type) {
            case "detect":                                                                                              // 단말에 연결된 센서당 이벤트 발생 빈도를 확인할 경우,
                const sensorIndex = req.body.index;
                const udData = await getAccessEventDataBySensor(deviceList[CUR_POS].sensors[sensorIndex - 1].id);
                const opData = await getPickupEventDataBySensor(deviceList[CUR_POS].sensors[sensorIndex - 1].id);
                await res.json({result: true, udData: udData, opData: opData});
                break;
            case "access":                                                                                              // 단말의 시간대별 ACCESS EVENT 발생 빈도를 시각화할 경우,
                const accessEventData = await getAccessEventDataByDevice(deviceList[CUR_POS].id);
                await res.json({result: true, accessEventData: accessEventData});
                break;
            case "pickup":                                                                                              // 단말의 시간대별 PICKUP EVENT 발생 빈도를 시각화할 경우,
                const pickupEventData = await getPickupEventDataByDevice(deviceList[CUR_POS].id);
                await res.json({result: true, pickupEventData: pickupEventData});
                break;
            case "stay":                                                                                                // 단말의 시간대별 STAY TIME 을 시각화 할 경우,
                const sensorId = req.body.sensorId;
                const stayEventData = await getStayEventDataBySensor(sensorId);
                await res.json({result: true, stayEventData: stayEventData});
                break;
            case "popup":                                                                                               // 단말의 팝업 표출 횟수를 시각화할 경우,
                const popupCount = await getDisplayPopupCount(deviceList[CUR_POS].id);
                await res.json({result: true, popupCount: popupCount});
                break;
            case "setting":                                                                                             // 단말에 설정되어 있는 팝업 리스트를 가져옴
                const list = await getPopupList(deviceList[CUR_POS].id);
                await res.json({result: true, list: list});
                break;
            default:                                                                                                    // 일치하는 TYPE 이 없을 경우,
                await res.json({result: false, message: "Type Error"});
                break;
        }
    } else {
        await res.json({result: false, message: "Not Found Device"});
    }
});

/* 디바이스의 각 센서당 이벤트 데이터 시각화하기 위한 API */
router.get('/sensor/:id', async function(req, res) {
    if (deviceList.length > 0) {
        const sensorIndex = Number(req.params.id);
        const udOption = await getAccessEventDataBySensor(deviceList[CUR_POS].sensors[sensorIndex - 1].id);
        const opOption = await getPickupEventDataBySensor(deviceList[CUR_POS].sensors[sensorIndex - 1].id);
        res.render('event-by-sensor', {currentMenu: "detail", sensorIndex: sensorIndex, deviceList: deviceList, pos: CUR_POS, userDetectionSerial: JSON.stringify(udOption), objectPickupSerial: JSON.stringify(opOption)});
    } else {
        res.redirect('/error');
    }
});

/* 단말을 변경하였을 경우, 단말에 연결된 센서 목록을 가져오기 위한 API */
router.post('/sensor/list', function(req, res) {
    if (deviceList.length > 0) {
        const deviceId = req.body.deviceId;

        let sensorList = [];
        for (const device of deviceList) {
            if (Number(device.id) === Number(deviceId)) {
                sensorList = device.sensors;
            }
        }
        res.json({result: true, sensorList: sensorList});
    } else {
        res.json({result: false, sensorList: []});
    }
});

/* 현재 선택한 단말의 ACCESS_EVENT 시각화 API */
router.get('/event/access', async function(req, res) {
    if (deviceList.length > 0) {
        const accessEventData = await getAccessEventDataByDevice(deviceList[CUR_POS].id);
        res.render('event_access', {currentMenu: "access", deviceList: deviceList, pos: CUR_POS, accessEventData: JSON.stringify(accessEventData)});
    } else {
        res.redirect('/error');
    }
});

/* 현재 선택한 단말의 PICKUP_EVENT 시각화 API */
router.get('/event/pickup', async function(req, res) {
    if (deviceList.length > 0) {
        const pickupEventData = await getPickupEventDataByDevice(deviceList[CUR_POS].id);
        res.render('event_pickup', {currentMenu: "pickup", deviceList: deviceList, pos: CUR_POS, pickupEventData: JSON.stringify(pickupEventData)});
    } else {
        res.redirect('/error');
    }
});

/* 현재 선택한 단말의 STAY_EVENT 시각화 API */
router.get('/event/stay', async function(req, res) {
    if (deviceList.length > 0) {
        const stayEventData = await getStayEventDataBySensor(deviceList[CUR_POS].sensors[0].id);
        res.render('event_stay', {currentMenu: "stay", deviceList: deviceList, pos: CUR_POS, stayEventData: JSON.stringify(stayEventData)});
    } else {
        res.redirect('/error');
    }
});

/* 현재 선택한 단말의 시간대별 이벤트 팝업 표출 횟수 시각화 API */
router.get('/advertise', async function(req, res) {
    if (deviceList.length > 0) {
        const adOption = await getDisplayPopupCount(deviceList[CUR_POS].id);
        res.render('advertise', {currentMenu: "advertise", deviceList: deviceList, pos: CUR_POS, advertisementSerial: JSON.stringify(adOption)});
    } else {
        res.redirect('/error');
    }
});

/* SETTING PAGE */
router.get('/setting', async function(req, res) {
    if (deviceList.length > 0) {
        res.render('setting', {currentMenu: "setting", deviceList: deviceList, pos: CUR_POS});    // Sensor 에 각 이벤트 데이터를 파라미터로 넘겨줌 ( m1.ejs 를 표출 )
    } else {
        res.redirect('/error');
    }
});

/* 현재 선택한 단말에 설정되어 있는 팝업 리스트를 가져오기 위한 API */
router.get('/setting/popup/list', async function(req, res) {
    const result = await getPopupList(deviceList[CUR_POS].id);
    await res.json(result);
});

/* ADD POPUP SETTING */
router.post('/setting/popup/add', async function(req, res) {
    const option = JSON.parse(req.body.option);
    const result = await query.addPopupSetting(deviceList[CUR_POS].id, option);
    await res.json(result);
});

/* UPDATE POPUP SETTING */
router.post('/setting/popup/update', async function(req, res) {
    const option = JSON.parse(req.body.option);
    const result = await query.updatePopupSetting(deviceList[CUR_POS].id, option);
    await res.json(result);
});

/* DELETE POPUP SETTING */
router.post('/setting/popup/delete', async function(req, res) {
    const popupId = req.body.id;
    const result = await query.deletePopupSetting(popupId);
    await res.json(result);
});


/* 
 * 센서의 ACCESS EVENT 데이터 (데이터베이스에 저장한 데이터를 Load, 시간대별로 시각화를 위한 데이터 가공)
 */
async function getAccessEventDataBySensor(sensorsId) {
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
/* 
 * 단말의 ACCESS EVENT 데이터 (데이터베이스에 저장한 데이터를 Load, 시간대별로 시각화를 위한 데이터 가공)
 */
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

/* 
 * 센서의 PICKUP EVENT 데이터 (데이터베이스에 저장한 데이터를 Load, 시간대별로 시각화를 위한 데이터 가공)
 */
async function getPickupEventDataBySensor(sensorsId) {
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
/* 
 * 단말의 PICKUP EVENT 데이터 (데이터베이스에 저장한 데이터를 Load, 시간대별로 시각화를 위한 데이터 가공)
 */
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

/*
 * 센서의 STAY TIME 데이터 (데이터베이스에 저장한 데이터를 Load, 시간대별로 시각화를 위한 데이터 가공)
 */
async function getStayEventDataBySensor(sensorId) {
    const selectStayEventResult = await query.getStayEventBySensor(sensorId);           // 사용자가 센서 앞에서 얼마나 머물렀는지를 알 수 있는 Duration 값을 DB 에서 가져옴
    if (selectStayEventResult.result && selectStayEventResult.message.length > 0) {
        const convertedData = await convert.convertStayTimeArrayToTimeData(selectStayEventResult.message[0]);             // Duration Data 를 시각화하기 위해 이벤트 발생 시간을 기준으로 데이터 가공
        console.log(convertedData);
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

/*
 * 단말의 팝업 표출 횟수 (데이터베이스에 저장한 데이터를 Load, 시간대별로 시각화를 위한 데이터 가공)
 */
async function getDisplayPopupCount(deviceId) {
    let advertisementCount;

    const advertisementResult = await query.getDisplayPopupByDevice(deviceId);         // DB 에서 팝업 표출 횟수를 가져옴
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

/* 단말에 설정되어 있는 팝업 내역 */
async function getPopupList(deviceId) {
    const result = await query.getPopupSettingList(deviceId);
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
