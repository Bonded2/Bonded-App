import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import useDataStore from '../../store/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Heart, 
  Shield, 
  Users, 
  FileText, 
  Camera, 
  MessageSquare, 
  Upload, 
  Download, 
  Settings,
  Plus,
  TrendingUp,
  Lock,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

const Dashboard = () => {
  const { user, hasThresholdKeys } = useAuth();
  const { 
    evidenceEntries, 
    relationships, 
    loadEvidenceTimeline, 
    loadRelationships,
    getEvidenceStats 
  } = useDataStore();

  const [stats, setStats] = useState({
    total: 0,
    sources: {},
    fileTypes: {},
    totalSize: 0,
    dateRange: null,
  });

  useEffect(() => {
    loadEvidenceTimeline();
    loadRelationships();
  }, []);

  useEffect(() => {
    setStats(getEvidenceStats());
  }, [evidenceEntries]);

  const formatFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCompletionPercentage = () => {
    let completed = 0;
    const total = 5;

    if (user?.username) completed++;
    if (hasThresholdKeys()) completed++;
    if (evidenceEntries.length > 0) completed++;
    if (relationships.length > 0) completed++;
    if (user?.settings?.image_filter_enabled) completed++;

    return Math.round((completed / total) * 100);
  };

  return (
    <div className="min-h-screen bg-secondary p-6 pb-safe">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-h1 font-trocchi text-white mb-2">
                Welcome back, {user?.username || 'User'}
              </h1>
              <p className="text-body-large font-rethink text-white/80">
                Your immigration evidence is secure and ready
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button className="bg-accent text-black hover:bg-accent/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Evidence
              </Button>
            </div>
          </div>

          {/* Setup Progress */}
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-h4 font-trocchi text-white">
                  Setup Progress
                </CardTitle>
                <span className="text-h5 font-rethink text-accent font-medium">
                  {getCompletionPercentage()}%
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Progress 
                value={getCompletionPercentage()} 
                className="h-3 bg-white/20"
              />
              <div className="flex items-center justify-between mt-3 text-body-small font-rethink text-white/80">
                <span>Complete your profile setup</span>
                <span>Ready for immigration</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Evidence Overview */}
          <Card className="lg:col-span-2 bg-white shadow-elevation-2dp">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-h3 font-trocchi text-primary">
                    Evidence Timeline
                  </CardTitle>
                  <CardDescription className="text-body-large font-rethink">
                    Your relationship proof collection
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {evidenceEntries.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="text-h2 font-trocchi text-primary mb-1">
                        {stats.total}
                      </div>
                      <div className="text-body-small font-rethink text-muted-foreground">
                        Total Files
                      </div>
                    </div>
                    <div className="text-center p-4 bg-secondary/5 rounded-lg border border-secondary/20">
                      <div className="text-h2 font-trocchi text-secondary mb-1">
                        {Object.keys(stats.sources).length}
                      </div>
                      <div className="text-body-small font-rethink text-muted-foreground">
                        Sources
                      </div>
                    </div>
                    <div className="text-center p-4 bg-success/5 rounded-lg border border-success/20">
                      <div className="text-h2 font-trocchi text-success mb-1">
                        {formatFileSize(stats.totalSize)}
                      </div>
                      <div className="text-body-small font-rethink text-muted-foreground">
                        Total Size
                      </div>
                    </div>
                    <div className="text-center p-4 bg-accent/5 rounded-lg border border-accent/20">
                      <div className="text-h2 font-trocchi text-accent mb-1">
                        {Object.keys(stats.fileTypes).length}
                      </div>
                      <div className="text-body-small font-rethink text-muted-foreground">
                        File Types
                      </div>
                    </div>
                  </div>

                  {/* Recent Evidence */}
                  <div className="space-y-3">
                    <h4 className="text-h5 font-trocchi text-primary">Recent Evidence</h4>
                    {evidenceEntries.slice(0, 3).map((entry, index) => (
                      <div key={entry.id} className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0">
                          {entry.metadata.source === 'PhotoLibrary' && (
                            <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                              <Camera className="w-5 h-5 text-success" />
                            </div>
                          )}
                          {entry.metadata.source === 'Telegram' && (
                            <div className="w-10 h-10 bg-info/10 rounded-full flex items-center justify-center">
                              <MessageSquare className="w-5 h-5 text-info" />
                            </div>
                          )}
                          {entry.metadata.source === 'Manual' && (
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-body-large font-rethink text-primary font-medium">
                            {entry.metadata.file_type}
                          </div>
                          <div className="text-body-small font-rethink text-muted-foreground">
                            {new Date(entry.created_at * 1000).toLocaleDateString()} • {formatFileSize(entry.metadata.file_size)}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-success" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-h4 font-trocchi text-primary mb-2">No Evidence Yet</h3>
                  <p className="text-body-large font-rethink text-muted-foreground mb-6">
                    Start collecting relationship evidence for your immigration application
                  </p>
                  <Button className="bg-primary hover:bg-primary/90 text-white">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload First Evidence
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Cards */}
          <div className="space-y-6">
            {/* Security Status */}
            <Card className="bg-white shadow-elevation-2dp">
              <CardHeader>
                <CardTitle className="text-h4 font-trocchi text-primary flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-body-large font-rethink text-muted-foreground">
                    Threshold Keys
                  </span>
                  {hasThresholdKeys() ? (
                    <div className="flex items-center text-success">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      <span className="text-body-small font-rethink font-medium">Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-destructive">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      <span className="text-body-small font-rethink font-medium">Setup Required</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-large font-rethink text-muted-foreground">
                    Encryption
                  </span>
                  <div className="flex items-center text-success">
                    <Lock className="w-4 h-4 mr-1" />
                    <span className="text-body-small font-rethink font-medium">Enabled</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-large font-rethink text-muted-foreground">
                    Content Filters
                  </span>
                  <div className="flex items-center text-success">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-body-small font-rethink font-medium">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Relationships */}
            <Card className="bg-white shadow-elevation-2dp">
              <CardHeader>
                <CardTitle className="text-h4 font-trocchi text-primary flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Relationships
                </CardTitle>
              </CardHeader>
              <CardContent>
                {relationships.length > 0 ? (
                  <div className="space-y-3">
                    {relationships.slice(0, 2).map((relationship) => (
                      <div key={relationship.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
                          <Heart className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-body-large font-rethink text-primary font-medium">
                            {relationship.relationship_type}
                          </div>
                          <div className="text-body-small font-rethink text-muted-foreground">
                            {relationship.status}
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      className="w-full border-primary text-primary hover:bg-primary/10"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Invite Partner
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-body-large font-rethink text-muted-foreground mb-4">
                      No relationships configured
                    </p>
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Invite Partner
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-accent/10 to-success/10 border-accent/20">
              <CardHeader>
                <CardTitle className="text-h4 font-trocchi text-primary">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start border-primary text-primary hover:bg-primary/10"
                >
                  <Camera className="w-4 h-4 mr-3" />
                  Upload Photos
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-secondary text-secondary hover:bg-secondary/10"
                >
                  <MessageSquare className="w-4 h-4 mr-3" />
                  Import Messages
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-success text-success hover:bg-success/10"
                >
                  <FileText className="w-4 h-4 mr-3" />
                  Upload Documents
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="bg-white shadow-elevation-2dp">
          <CardHeader>
            <CardTitle className="text-h3 font-trocchi text-primary flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {evidenceEntries.length > 0 ? (
              <div className="space-y-4">
                {evidenceEntries.slice(0, 5).map((entry, index) => (
                  <div key={entry.id} className="flex items-start space-x-4 pb-4 border-b border-muted last:border-b-0">
                    <div className="w-2 h-2 bg-primary rounded-full mt-3 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-body-large font-rethink text-primary">
                        New {entry.metadata.source.toLowerCase()} evidence uploaded
                      </p>
                      <p className="text-body-small font-rethink text-muted-foreground">
                        {new Date(entry.created_at * 1000).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-body-large font-rethink text-muted-foreground">
                  No activity yet. Start uploading evidence to see your timeline.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;