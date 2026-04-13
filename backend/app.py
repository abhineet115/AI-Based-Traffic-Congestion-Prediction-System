"""
Traffic Congestion System - Flask Backend API v3.1
Run: python app.py
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib, os, heapq, time, datetime
import requests as req_lib
import config as cfg

app = Flask(__name__)
CORS(app)

# ── ML Model ───────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')
model = None
if os.path.exists(MODEL_PATH):
    try:
        model = joblib.load(MODEL_PATH)
        print("[OK]  ML model loaded")
    except Exception as e:
        print(f"[WARN] {e}")

# ── Cache ──────────────────────────────────────────────────────────────────
_cache = {}
def cache_get(key):
    e = _cache.get(key)
    return e['data'] if e and (time.time()-e['ts']) < e['ttl'] else None
def cache_set(key, data, ttl=60):
    _cache[key] = {'data': data, 'ts': time.time(), 'ttl': ttl}

# ── OWM helpers ────────────────────────────────────────────────────────────
def owm_code_to_internal(wid, icon=''):
    if 200<=wid<300: return {'code':'heavy_rain','label':'Thunderstorm','icon':'\u26C8\uFE0F','traffic_impact':'High'}
    if 300<=wid<400: return {'code':'rain','label':'Drizzle','icon':'\U0001F327\uFE0F','traffic_impact':'Medium'}
    if 500<=wid<510:
        if wid in(502,503,504): return {'code':'heavy_rain','label':'Heavy Rain','icon':'\u26C8\uFE0F','traffic_impact':'High'}
        return {'code':'rain','label':'Light Rain','icon':'\U0001F327\uFE0F','traffic_impact':'Medium'}
    if wid==511: return {'code':'snow','label':'Freezing Rain','icon':'\U0001F328\uFE0F','traffic_impact':'High'}
    if 520<=wid<600: return {'code':'rain','label':'Shower Rain','icon':'\U0001F327\uFE0F','traffic_impact':'Medium'}
    if 600<=wid<700: return {'code':'snow','label':'Snow','icon':'\U0001F328\uFE0F','traffic_impact':'High'}
    if 700<=wid<800: return {'code':'fog','label':'Fog/Haze','icon':'\U0001F32B\uFE0F','traffic_impact':'High' if wid in(741,761,762) else 'Medium'}
    if wid==800: return {'code':'clear','label':'Clear Night' if 'n' in icon else 'Clear Sky','icon':'\U0001F319' if 'n' in icon else '\u2600\uFE0F','traffic_impact':'Low'}
    if wid in(801,802): return {'code':'cloudy','label':'Partly Cloudy','icon':'\u26C5','traffic_impact':'Low'}
    return {'code':'cloudy','label':'Cloudy','icon':'\u2601\uFE0F','traffic_impact':'Low'}

def wx_to_int(code):
    return {'clear':0,'cloudy':0,'rain':1,'heavy_rain':2,'fog':2,'snow':2}.get(code,0)

# ── Road graph ─────────────────────────────────────────────────────────────
NODES = {
    'A':{'name':'Downtown Terminal','lat':40.7128,'lng':-74.0060},
    'B':{'name':'Harbor Bridge','lat':40.7168,'lng':-74.0090},
    'C':{'name':'West Side Highway','lat':40.7190,'lng':-74.0030},
    'D':{'name':'Midtown Connector','lat':40.7155,'lng':-73.9970},
    'E':{'name':'Business District','lat':40.7220,'lng':-74.0000},
    'F':{'name':'North Gate','lat':40.7240,'lng':-74.0060},
}
EDGES = [('A','B',2.1,1.0),('A','D',3.5,1.8),('B','C',1.8,0.5),('B','D',2.4,1.5),('C','E',2.2,0.6),('C','F',3.1,0.4),('D','E',1.9,1.4),('E','F',1.3,0.8)]

def build_graph(mult=1.0):
    import random
    g={n:[] for n in NODES}
    for f,t,d,cw in EDGES:
        c=d+cw*mult*random.uniform(0.9,1.1)
        g[f].append({'to':t,'cost':c,'dist':d}); g[t].append({'to':f,'cost':c,'dist':d})
    return g

def dijkstra(graph,start,end):
    dist={n:float('inf') for n in graph}; prev={n:None for n in graph}
    dist[start]=0; pq=[(0,start)]; vis=set()
    while pq:
        cost,node=heapq.heappop(pq)
        if node in vis: continue
        vis.add(node)
        if node==end: break
        for nb in graph[node]:
            nc=cost+nb['cost']
            if nc<dist[nb['to']]: dist[nb['to']]=nc; prev[nb['to']]=node; heapq.heappush(pq,(nc,nb['to']))
    path,cur=[],end
    while cur: path.append(cur); cur=prev[cur]
    path.reverse(); return path,dist[end]

# ── TomTom helpers ─────────────────────────────────────────────────────────
def tomtom_flow(lat, lon):
    key = cfg.TOMTOM_API_KEY
    if not key or key=='YOUR_TOMTOM_API_KEY': return None
    try:
        url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point={lat},{lon}&key={key}"
        r = req_lib.get(url, timeout=6)
        if r.status_code != 200: return None
        seg = r.json().get('flowSegmentData',{})
        cs  = seg.get('currentSpeed',0)
        ff  = seg.get('freeFlowSpeed',1) or 1
        return {'currentSpeed':cs,'freeFlowSpeed':ff,'speed_ratio':round(cs/ff,3),
                'travelTime':seg.get('currentTravelTime',0),'freeFlowTravelTime':seg.get('freeFlowTravelTime',0),
                'roadClosure':seg.get('roadClosure',False)}
    except Exception as e:
        print(f"[WARN] TomTom flow: {e}"); return None

def ratio_to_level(r):
    if r is None: return 'Medium'
    if r>=0.75: return 'Low'
    if r>=0.45: return 'Medium'
    return 'High'

# ── Endpoints ──────────────────────────────────────────────────────────────

@app.route('/api/health')
def health():
    return jsonify({'status':'ok','version':'3.1.0',
        'model':model is not None,
        'owm': cfg.OWM_API_KEY!='YOUR_OPENWEATHERMAP_API_KEY',
        'tomtom': cfg.TOMTOM_API_KEY!='YOUR_TOMTOM_API_KEY'})

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.json or {}
    try:
        h=int(data.get('time_of_day', datetime.datetime.now().hour))
        dow=int(data.get('day_of_week', datetime.datetime.now().weekday()))
        rt=int(data.get('road_type',1)); w=int(data.get('weather',0))
        lat=float(data.get('lat',cfg.DEFAULT_LAT)); lon=float(data.get('lon',cfg.DEFAULT_LON))
        cached=cache_get(f'weather_{lat}_{lon}')
        if cached: w=wx_to_int(cached.get('current',{}).get('code','clear'))
        if model: level=model.predict([[h,dow,w,rt]])[0]
        else: level='High' if (7<=h<=9 or 17<=h<=19 or w>=2) else 'Medium' if (10<=h<=16 or w==1) else 'Low'
        return jsonify({'congestion_level':level})
    except Exception as e: return jsonify({'error':str(e)}),400

@app.route('/api/route')
def get_route():
    start=request.args.get('start','A'); end=request.args.get('end','F')
    if start not in NODES: start='A'
    if end not in NODES: end='F'
    g=build_graph(); path,score=dijkstra(g,start,end)
    route_nodes=[{'node':n,**NODES[n]} for n in path]
    total_km=round(sum(e[2] for e in EDGES if e[0] in path and e[1] in path),1)
    return jsonify({'route':route_nodes,'route_path_ids':path,'total_score':round(score,2),
        'estimated_time_mins':max(10,int(score*4.5)),'distance_km':total_km,
        'nodes':NODES,'edges':[{'from':e[0],'to':e[1],'dist':e[2],'congestion':e[3]} for e in EDGES]})

@app.route('/api/analytics')
def analytics():
    import random
    return jsonify({'weekly':[85,92,88,96,115,68,55],'hourly':[20,95,55,40,45,88,100,35,18,10],
        'zones':{'Downtown Core':random.randint(70,95),'Harbor Bridge':random.randint(40,70),
                 'West Highway':random.randint(20,50),'Business Dist.':random.randint(60,85)}})

@app.route('/api/weather')
def weather():
    import random
    lat=float(request.args.get('lat',cfg.DEFAULT_LAT)); lon=float(request.args.get('lon',cfg.DEFAULT_LON))
    ck=f'weather_{lat}_{lon}'
    cached=cache_get(ck)
    if cached: return jsonify(cached)
    key=cfg.OWM_API_KEY
    if key and key!='YOUR_OPENWEATHERMAP_API_KEY':
        try:
            cur=req_lib.get(f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={key}&units=metric",timeout=6).json()
            fct=req_lib.get(f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={key}&units=metric&cnt=40",timeout=6).json()
            wid=cur['weather'][0]['id']; icon=cur['weather'][0]['icon']
            mapped=owm_code_to_internal(wid,icon)
            current={**mapped,'label':cur['weather'][0]['description'].title(),
                'temp':round(cur['main']['temp']),'feels_like':round(cur['main']['feels_like']),
                'humidity':cur['main']['humidity'],'wind':round(cur['wind']['speed']*3.6,1),
                'pressure':cur['main']['pressure'],'visibility':round(cur.get('visibility',10000)/1000,1)}
            location=f"{cur.get('name','')}, {cur.get('sys',{}).get('country','')}"
            hourly=[]
            for slot in (fct.get('list',[])[:8]):
                m=owm_code_to_internal(slot['weather'][0]['id'],slot['weather'][0]['icon'])
                hourly.append({'hour':slot['dt_txt'][11:16],'temp':round(slot['main']['temp']),
                    'precip_prob':round(slot.get('pop',0)*100),'icon':m['icon']})
            forecast=[]; seen=set()
            for slot in fct.get('list',[]):
                day=slot['dt_txt'][:10]
                if day==datetime.date.today().isoformat() or day in seen: continue
                if '12:00:00' not in slot['dt_txt'] and '15:00:00' not in slot['dt_txt']: continue
                seen.add(day)
                m=owm_code_to_internal(slot['weather'][0]['id'],slot['weather'][0]['icon'])
                forecast.append({**m,'label':slot['weather'][0]['description'].title(),
                    'temp':round(slot['main']['temp']),'temp_min':round(slot['main']['temp_min']),
                    'temp_max':round(slot['main']['temp_max']),
                    'day':datetime.datetime.strptime(day,'%Y-%m-%d').strftime('%a'),
                    'precip_prob':round(slot.get('pop',0)*100)})
                if len(forecast)>=4: break
            result={'current':current,'location':location,'lat':lat,'lon':lon,
                'last_updated':datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                'forecast':forecast,'hourly':hourly,'source':'OpenWeatherMap'}
            cache_set(ck,result,cfg.WEATHER_CACHE_TTL); return jsonify(result)
        except Exception as e: print(f"[WARN] OWM: {e}")
    # Fallback
    fb={'current':{'code':'clear','label':'Clear Sky','icon':'\u2600\uFE0F','temp':28,'feels_like':30,
            'humidity':60,'wind':14.0,'pressure':1012,'visibility':10.0,'traffic_impact':'Low'},
        'location':cfg.DEFAULT_CITY,'lat':lat,'lon':lon,
        'last_updated':datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'forecast':[
            {'code':'cloudy','label':'Partly Cloudy','icon':'\u26C5','temp':27,'temp_min':24,'temp_max':30,'traffic_impact':'Low','day':'Tomorrow','precip_prob':10},
            {'code':'rain','label':'Light Rain','icon':'\U0001F327\uFE0F','temp':24,'temp_min':21,'temp_max':26,'traffic_impact':'Medium','day':'Wed','precip_prob':60},
            {'code':'clear','label':'Clear Sky','icon':'\u2600\uFE0F','temp':29,'temp_min':25,'temp_max':32,'traffic_impact':'Low','day':'Thu','precip_prob':5},
            {'code':'heavy_rain','label':'Heavy Rain','icon':'\u26C8\uFE0F','temp':22,'temp_min':19,'temp_max':24,'traffic_impact':'High','day':'Fri','precip_prob':90}],
        'hourly':[{'hour':f'{6+i*2:02d}:00','temp':28,'precip_prob':5,'icon':'\u2600\uFE0F'} for i in range(8)],
        'source':'fallback'}
    return jsonify(fb)

@app.route('/api/traffic-flow')
def traffic_flow():
    import random, hashlib
    lat=float(request.args.get('lat', cfg.DEFAULT_LAT))
    lon=float(request.args.get('lon', cfg.DEFAULT_LON))
    user_requested = 'lat' in request.args

    ck = f'trafficflow_{round(lat,3)}_{round(lon,3)}'
    cached = cache_get(ck)
    if cached: return jsonify(cached)

    h=datetime.datetime.now().hour
    result={}; has_real=False; user_point=None

    # If user location requested, fetch for that specific point first
    if user_requested:
        flow = tomtom_flow(lat, lon)
        if flow:
            has_real = True
            level = ratio_to_level(flow['speed_ratio'])
            user_point = {**flow, 'level': level, 'lat': lat, 'lng': lon}

    # Fetch for each road node
    for nid, info in NODES.items():
        flow = tomtom_flow(info['lat'], info['lng'])
        if flow:
            has_real = True
            level = ratio_to_level(flow['speed_ratio'])
            result[nid] = {'node':nid,'name':info['name'],'lat':info['lat'],'lng':info['lng'],
                'speed_ratio':flow['speed_ratio'],'currentSpeed':flow['currentSpeed'],
                'freeFlowSpeed':flow['freeFlowSpeed'],'level':level,'source':'tomtom'}
        else:
            seed=int(hashlib.md5(nid.encode()).hexdigest(),16)%100
            if (7<=h<=9 or 17<=h<=19): base=0.25+(seed%30)/100
            elif 10<=h<=16: base=0.50+(seed%30)/100
            else: base=0.80+(seed%15)/100
            result[nid]={'node':nid,'name':info['name'],'lat':info['lat'],'lng':info['lng'],
                'speed_ratio':round(base,3),'level':ratio_to_level(base),'source':'heuristic'}

    payload={'nodes':result,'source':'tomtom' if has_real else 'heuristic','hour':h,
        'updated':datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}
    if user_point: payload['user_point'] = user_point
    cache_set(ck, payload, cfg.TRAFFIC_CACHE_TTL)
    return jsonify(payload)

@app.route('/api/incidents')
def incidents():
    lat=float(request.args.get('lat',cfg.DEFAULT_LAT))
    lon=float(request.args.get('lon',cfg.DEFAULT_LON))
    ck=f'incidents_{round(lat,2)}_{round(lon,2)}'
    cached=cache_get(ck)
    if cached: return jsonify(cached)
    key=cfg.TOMTOM_API_KEY
    if not key or key=='YOUR_TOMTOM_API_KEY':
        return jsonify({'incidents':[],'source':'no_key','total':0})
    r=0.08
    bbox=f"{lon-r},{lat-r},{lon+r},{lat+r}"
    fields="{incidents{type,geometry{coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers}}}"
    try:
        resp=req_lib.get("https://api.tomtom.com/traffic/services/5/incidentDetails",
            params={'key':key,'bbox':bbox,'fields':fields,'language':'en-GB',
                    'categoryFilter':'0,1,2,3,4,5,6,7,8,9,10,11','timeValidityFilter':'present'},timeout=8)
        if resp.status_code!=200:
            print(f"[WARN] Incidents API {resp.status_code}")
            return jsonify({'incidents':[],'source':'error','total':0})
        data=resp.json(); inc_list=[]
        cats={0:'Unknown',1:'Accident',2:'Fog',3:'Dangerous Conditions',4:'Rain',5:'Ice',
              6:'Traffic Jam',7:'Lane Closed',8:'Road Closed',9:'Road Works',10:'Wind',11:'Flooding',14:'Broken Down'}
        for inc in data.get('incidents',[]):
            props=inc.get('properties',{}); geom=inc.get('geometry',{})
            coords=geom.get('coordinates',[])
            if not coords: continue
            c=coords[0] if isinstance(coords[0],list) else coords
            try: lat_i,lon_i=c[1],c[0]
            except: continue
            evts=props.get('events',[{}]); desc=evts[0].get('description','Traffic incident') if evts else 'Traffic incident'
            delay=props.get('delay',0) or 0
            inc_list.append({'id':props.get('id',str(len(inc_list))),'lat':lat_i,'lon':lon_i,
                'category':props.get('iconCategory',0),
                'category_name':cats.get(props.get('iconCategory',0),'Incident'),
                'description':desc,'delay_seconds':delay,'delay_minutes':round(delay/60,1),
                'from':props.get('from',''),'to':props.get('to',''),
                'magnitude':props.get('magnitudeOfDelay',0),
                'road':props.get('roadNumbers',[])})
        result={'incidents':inc_list[:25],'total':len(inc_list),'source':'tomtom',
            'updated':datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}
        cache_set(ck,result,60); return jsonify(result)
    except Exception as e:
        print(f"[WARN] Incidents: {e}"); return jsonify({'incidents':[],'source':'error','total':0})

@app.route('/api/analyze-camera', methods=['POST'])
def analyze_camera():
    import random
    h=datetime.datetime.now().hour
    if 7<=h<=9 or 17<=h<=19: level,count='High',random.randint(18,30); detail='Rush hour. Heavy queued traffic. ~15 km/h.'
    elif 22<=h or h<=5: level,count='Low',random.randint(1,6); detail='Clear roads. Free-flow ~65 km/h.'
    else: level,count='Medium',random.randint(7,17); detail='Moderate traffic. ~35 km/h.'
    return jsonify({'congestion_level':level,'vehicle_count':count,'detail':detail,
        'confidence':round(random.uniform(0.87,0.97),2),
        'recommendations':['Use I-42 North to bypass.' if level=='High' else 'Route is optimal.',
                           f'Clear in {random.randint(8,25)} min.' if level!='Low' else 'No delays expected.']})

if __name__=='__main__':
    owm=cfg.OWM_API_KEY!='YOUR_OPENWEATHERMAP_API_KEY'
    tt=cfg.TOMTOM_API_KEY!='YOUR_TOMTOM_API_KEY'
    print("\n"+"="*55)
    print("  Traffic Congestion System  v3.1")
    print("="*55)
    print(f"  Weather:  {'OpenWeatherMap LIVE' if owm else 'Fallback'}")
    print(f"  Traffic:  {'TomTom LIVE' if tt else 'Heuristic'}")
    print(f"  Incidents:{'TomTom LIVE' if tt else 'Not available'}")
    print("="*55+"\n")
    app.run(host='0.0.0.0',port=5000,debug=True,use_reloader=False)
