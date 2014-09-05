Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
     items: [
        {
            xtype: 'container',
            itemId: 'exportBtn'
        },
        {
            xtype: 'container',
            itemId: 'artifactGrid'
        }
    ],
launch: function() {
    var that =  this;
        var millisecondsInDay = 86400000;
        var currentDate = new Date();
        var startDate = new Date(currentDate - millisecondsInDay*90); //in the last 90 days
        var startDateUTC = startDate.toISOString();
        
        this._filters = [
            {
                property : 'CreationDate',
                operator : '>=',
                value : startDateUTC
            }	
   	];
        this._myMask = new Ext.LoadMask(Ext.getBody(), {msg:"Please wait.This may take long depending on the size of your data..."});
        this._myMask.show();
        Ext.create('Rally.data.WsapiDataStore',{
   		model: 'ConversationPost',
		autoLoad: true,
		remoteSort: false,
   		fetch: ['Artifact','Text','FormattedID','ScheduleState', 'Project'],
   		filters: this._filters,
                limit: Infinity,
                context: {
                    //project : "/project/10823784037", // ALM
                    projectScopeDown: true
                },
   		listeners: {
   		    load: that._onConversationsLoaded,
   		    scope:this
   		}
   	});

   },
   _onConversationsLoaded: function(store,data){
        var posts = [];
        _.each(data, function(post) {
            var text = post.get('Text');
            //if (text.indexOf("associated to Salesforce")>=0) { //uncomment this line and comment out the line below if you want to include stories
            if ((_.contains(post.get('Artifact')._ref ,"defect")) && (text.indexOf("associated to Salesforce")>=0)) {
                text = text.match(/(<[Aa]\s(.*)<\/[Aa]>)/g);
                var p  = {
                    Case: text,
                    Name: post.get('Artifact').FormattedID,
                    Artifact: post.get('Artifact'),
                    ID: post.get('Artifact').FormattedID,
                    Project: post.get('Artifact').Project._refObjectName
                };
            posts.push(p);
            }
        });
        this._rallyData = data;
        this._createGrid(posts);
   },
   
   _createGrid: function(posts) {
        this._myMask.hide();
        var that = this;
        that._posts = posts;
        var store = Ext.create('Rally.data.custom.Store', {
                data: posts,
                groupField: 'ID'  
            });
        that._grid = Ext.create('Rally.ui.grid.Grid',{
            showRowActionsColumn: false,
            itemId: 'mygrid',
            store: store,
            columnCfgs: [
                {
                   text: 'Artifact', dataIndex: 'Artifact', renderer: function(value){
                        return '<a href="'+ Rally.nav.Manager.getDetailUrl(value) +'" target="_blank">' + value.FormattedID +'</a>'
                   }
                },
                {text: 'Case', dataIndex: 'Case',
                },
                {text: 'Project', dataIndex: 'Project'}
                
            ]
        });
        this.down('#artifactGrid').add(that._grid);
         this.down('#exportBtn').add({
            xtype: 'rallybutton',
            text: 'Export to CSV',
            handler: function(){
                that._onClickExport(that._grid)
            }
        });
    },
    _onClickExport: function(grid){
            var data = this._getCSV(grid);
            window.location = 'data:text/csv;charset=utf8,' + encodeURIComponent(data);
    },
     _getCSV: function (grid) {
        
        var cols    = grid.columns;
        var store   = grid.store;
        var data = '';

        var that = this;
        _.each(cols, function(col, index) {
                data += that._getFieldTextAndEscape(col.text) + ',';
        });
        data += "\r\n";
        _.each(that._posts, function(record) {
            _.each(cols, function(col, index) {
                var text = '';
                var fieldName   = col.dataIndex;
                if (fieldName === "Artifact") {
                    text = record[fieldName].FormattedID;
                }
                else if (fieldName === "Project" ) {
                    text = record[fieldName];
                }
                else if (fieldName === "Case") {
                    var size = _.size(record[fieldName]);
                    for (var i = 0; i < size; i++){
                        text = record[fieldName][i]
                    }
                }
                
                data += that._getFieldTextAndEscape(text) + ',';

            });
            data += "\r\n";
        });

        return data;
    },
     _getFieldTextAndEscape: function(fieldData) {
        var string  = this._getFieldText(fieldData);  
        return this._escapeForCSV(string);
    },
    
     _getFieldText: function(fieldData) {
        var text;
        if (fieldData === null || fieldData === undefined || !fieldData.match) {
            text = '';
        } else if (fieldData._refObjectName) {
            text = fieldData._refObjectName;
        }else {
            text = fieldData;
        }

        return text;
    },
     _escapeForCSV: function(string) {
        if (string.match(/,/)) {
            if (!string.match(/"/)) {
                string = '"' + string + '"';
            } else {
                string = string.replace(/,/g, ''); 
            }
        }
        return string;
    }
});

