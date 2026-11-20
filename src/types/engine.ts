export type FlightStatus = 'ontime' | 'delayed_minor' | 'delayed_major' | 'cancelled';
export type DelayCause = 'closure_hold' | 'aircraft_knock_on' | 'crew_limit' | 'none';

export interface AirportClosure {
  id: string;
  airport: string; // airport ID, e.g. "BOM"
  start_min: number; // minutes from 00:00 (e.g. 14:00 is 840)
  end_min: number;   // minutes from 00:00 (e.g. 15:30 is 930)
}

export interface EngineSettings {
  arrivalRule: 'hold' | 'divert'; // default: 'hold'
  capacityBacklog: boolean;      // default: false (release held flights at most capacity_per_hour/hr)
  reducedMotion: boolean;        // UI setting
}

export interface FlightResult {
  flight_id: string;
  tail_id: string;
  leg_order: number;
  origin: string;
  destination: string;
  planned_dep: string;
  planned_arr: string;
  planned_dep_min: number;
  planned_arr_min: number;
  actual_dep: string;
  actual_arr: string;
  actual_dep_min: number;
  actual_arr_min: number;
  delay_minutes: number;
  status: FlightStatus;
  cause: DelayCause;
  caused_by?: string; // previous flight_id, or airport_id
  pax: number;
  is_cancelled: boolean;
  cancellation_reason?: string;
  assigned_crew_id?: string;
  turnaround_used_min?: number;
}

export interface AirportImpact {
  airport_id: string;
  name: string;
  city: string;
  tier: string;
  flights_affected: number;
  total_delay_minutes: number;
  departures_delayed: number;
  arrivals_delayed: number;
  cancellations: number;
  stranded_pax: number;
}

export interface ConnectionResult {
  connection_id: string;
  airport: string;
  from_flight: string;
  to_flight: string;
  passengers: number;
  min_connect_minutes: number;
  planned_connection_time: number;
  actual_connection_time: number;
  is_missed: boolean;
  missed_reason?: 'insufficient_turnaround' | 'from_cancelled' | 'to_cancelled';
}

export interface CrewDutyResult {
  crew_id: string;
  tail_id: string;
  base: string;
  duty_start: string;
  duty_start_min: number;
  max_duty_mins: number;
  duty_used_mins: number;
  is_timed_out: boolean;
  is_at_risk: boolean; // within 30 min of max_duty_mins
  last_flight_arr_min: number;
  flight_ids: string[];
  flown_flight_ids: string[];
  cancelled_flight_ids: string[];
}

export interface SimulationKPIs {
  delayed_flights: number;
  cancelled_flights: number;
  total_delay_minutes: number;
  stranded_pax_total: number;
  stranded_pax_missed_connections: number;
  stranded_pax_cancelled_flights: number;
  crews_at_risk: number;
  crews_timed_out: number;
  delay_by_cause: {
    closure_hold: number;
    aircraft_knock_on: number;
    crew_limit: number;
    none: number;
  };
}

export interface ResultJSON {
  flights: Record<string, FlightResult>;
  airports: Record<string, AirportImpact>;
  connections: Record<string, ConnectionResult>;
  crews: Record<string, CrewDutyResult>;
  kpis: SimulationKPIs;
  closures: AirportClosure[];
  applied_action?: RecoveryAction;
}

export type ActionType = 'cancel_flight' | 'swap_spare';

export interface RecoveryAction {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  flight_id?: string;
  spare_tail_id?: string;
  target_tail_id?: string;
  from_leg_order?: number;
}

export interface EvaluatedAction {
  action: RecoveryAction;
  result: ResultJSON;
  before_kpis: SimulationKPIs;
  after_kpis: SimulationKPIs;
  affected_flight_ids: string[];
  rank: number;
}
