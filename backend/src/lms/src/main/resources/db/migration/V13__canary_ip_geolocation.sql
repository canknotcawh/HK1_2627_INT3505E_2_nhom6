-- IP tracking + vị trí thiết bị cho canary token.
-- Lưu IP thô (để truy vết) song song với ip_hash cũ (để đối chiếu ẩn danh),
-- kèm kết quả phân giải vị trí tại đúng thời điểm truy cập.

ALTER TABLE canary_token ADD COLUMN IF NOT EXISTS created_ip_address VARCHAR(45);

ALTER TABLE canary_access ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE canary_access ADD COLUMN IF NOT EXISTS ip_version VARCHAR(10);
ALTER TABLE canary_access ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE canary_access ADD COLUMN IF NOT EXISTS country_name VARCHAR(100);
ALTER TABLE canary_access ADD COLUMN IF NOT EXISTS region_name VARCHAR(120);
ALTER TABLE canary_access ADD COLUMN IF NOT EXISTS city_name VARCHAR(120);
ALTER TABLE canary_access ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE canary_access ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE canary_access ADD COLUMN IF NOT EXISTS time_zone VARCHAR(64);
ALTER TABLE canary_access ADD COLUMN IF NOT EXISTS isp VARCHAR(150);
ALTER TABLE canary_access ADD COLUMN IF NOT EXISTS location_source VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_canary_access_ip ON canary_access (ip_address);
