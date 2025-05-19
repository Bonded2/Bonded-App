import React from 'react';
import { useGeoMetadata } from './hooks/useGeoMetadata';

/**
 * Debug panel for geolocation data
 * Shows the current location metadata for testing and QA purposes
 */
export const LocationPanel = () => {
  const { metadata, isLoading, error, refreshMetadata } = useGeoMetadata();
  
  // Helper to format coordinates
  const formatCoords = (coords) => {
    if (!coords || (!coords.lat && coords.lat !== 0)) return 'Not available';
    return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
  };
  
  // Styles for better visual appearance
  const panelStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: "0.5rem",
    padding: "1rem",
    margin: "1rem 0",
    maxWidth: "32rem",
    marginLeft: "auto",
    marginRight: "auto",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
    border: "1px solid rgba(44, 76, 223, 0.2)"
  };
  
  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem"
  };
  
  const titleStyle = {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "#2C4CDF",
    fontFamily: "Trocchi, serif",
    margin: 0
  };
  
  const buttonStyle = {
    backgroundColor: "#B9FF46",
    color: "#2C4CDF",
    padding: "0.25rem 0.75rem", 
    borderRadius: "0.25rem",
    fontSize: "0.875rem",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s ease"
  };
  
  const labelStyle = {
    width: "33.333333%",
    fontWeight: "500",
    color: "#2C4CDF"
  };
  
  const valueStyle = {
    width: "66.666667%",
    color: "#333333"
  };
  
  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Location Metadata</h2>
        <button 
          onClick={refreshMetadata}
          style={buttonStyle}
          disabled={isLoading}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#a8e63f"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#B9FF46"}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {error && (
        <div style={{
          backgroundColor: "rgba(255, 112, 77, 0.2)",
          color: "#ff5a33",
          padding: "0.75rem",
          borderRadius: "0.25rem",
          marginBottom: "1rem",
          fontSize: "0.875rem"
        }}>
          Error: {error}
        </div>
      )}
      
      {isLoading && !metadata && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          margin: "1rem 0"
        }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: "#2C4CDF"}}></div>
        </div>
      )}
      
      {metadata && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          fontSize: "0.875rem"
        }}>
          {/* Timestamp */}
          <div style={{display: "flex", alignItems: "center"}}>
            <div style={labelStyle}>Timestamp:</div>
            <div style={valueStyle}>
              {new Date(metadata.timestamp).toLocaleString()}
            </div>
          </div>
          
          {/* Device GPS Location */}
          <div style={{display: "flex", alignItems: "flex-start"}}>
            <div style={labelStyle}>GPS Coordinates:</div>
            <div style={valueStyle}>
              {formatCoords(metadata.deviceLocation)}
              {metadata.deviceLocation?.accuracy && (
                <div style={{fontSize: "0.75rem", color: "#666666", marginTop: "0.25rem"}}>
                  Accuracy: ±{Math.round(metadata.deviceLocation.accuracy)}m
                </div>
              )}
            </div>
          </div>
          
          {/* Reverse Geocoded Location */}
          <div style={{display: "flex", alignItems: "flex-start"}}>
            <div style={labelStyle}>Resolved Address:</div>
            <div style={valueStyle}>
              {metadata.resolvedLocation?.fullAddress || 'Not available'}
              {metadata.resolvedLocation?.country && (
                <div style={{display: "flex", alignItems: "center", marginTop: "0.25rem"}}>
                  {metadata.resolvedLocation.country && (
                    <img 
                      src={`${metadata.resolvedLocation.country ? `https://flagcdn.com/16x12/${metadata.resolvedLocation.country.toLowerCase()}.png` : ''}`}
                      alt={metadata.resolvedLocation.countryName || ''}
                      style={{marginRight: "0.25rem"}}
                      className="inline-block"
                      width="16"
                      height="12"
                    />
                  )}
                  <span>
                    {[
                      metadata.resolvedLocation.city,
                      metadata.resolvedLocation.region,
                      metadata.resolvedLocation.countryName
                    ].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* IP Location */}
          <div style={{display: "flex", alignItems: "flex-start"}}>
            <div style={labelStyle}>IP Location:</div>
            <div style={valueStyle}>
              {metadata.ipLocation?.ip ? (
                <>
                  <div>{metadata.ipLocation.ip}</div>
                  {metadata.ipLocation.country && (
                    <div style={{display: "flex", alignItems: "center", marginTop: "0.25rem"}}>
                      {metadata.ipLocation.country && (
                        <img 
                          src={`${metadata.ipLocation.country ? `https://flagcdn.com/16x12/${metadata.ipLocation.country.toLowerCase()}.png` : ''}`}
                          alt={metadata.ipLocation.countryName || ''}
                          style={{marginRight: "0.25rem"}}
                          className="inline-block"
                          width="16"
                          height="12"
                        />
                      )}
                      <span>
                        {[
                          metadata.ipLocation.city,
                          metadata.ipLocation.region,
                          metadata.ipLocation.countryName
                        ].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                'Not available'
              )}
            </div>
          </div>
          
          {/* VPN Status */}
          <div style={{display: "flex", alignItems: "center"}}>
            <div style={labelStyle}>VPN Detection:</div>
            <div style={valueStyle}>
              {metadata.vpnCheck === null ? (
                'Unknown'
              ) : (
                <span style={{color: metadata.vpnCheck ? '#FF9500' : '#4CAF50'}}>
                  {metadata.vpnCheck ? '⚠️ VPN detected' : '✅ No VPN detected'}
                </span>
              )}
            </div>
          </div>
          
          {/* Location Consistency */}
          <div style={{display: "flex", alignItems: "center"}}>
            <div style={labelStyle}>Location Match:</div>
            <div style={valueStyle}>
              {metadata.locationMatch === null ? (
                'Unable to verify'
              ) : (
                <span style={{color: metadata.locationMatch ? '#4CAF50' : '#FF704D'}}>
                  {metadata.locationMatch ? '✅ Verified' : '❌ Inconsistent'}
                  {metadata.distance !== null && ` (${metadata.distance} km apart)`}
                </span>
              )}
            </div>
          </div>
          
          {/* Status Message */}
          {metadata.message && (
            <div style={{
              backgroundColor: "rgba(44, 76, 223, 0.1)",
              color: "#333333",
              padding: "0.75rem",
              borderRadius: "0.25rem",
              fontSize: "0.75rem",
              marginTop: "0.5rem"
            }}>
              {metadata.message}
            </div>
          )}
        </div>
      )}
      
      <div style={{
        marginTop: "1rem",
        fontSize: "0.75rem",
        color: "#666666"
      }}>
        This data will be securely attached to any files uploaded during this session.
      </div>
    </div>
  );
};

export default LocationPanel; 